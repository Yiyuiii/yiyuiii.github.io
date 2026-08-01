# frozen_string_literal: true

require "date"

module Yiyuiii
  module HomeFeed
    LANGUAGES = %w[zh en].freeze
    ITEM_KEYS = %w[id kind ref feed_date].freeze
    KINDS = %w[writing project publication].freeze

    module_function

    def build(site)
      manifest = site.data.fetch("home_feed")
      entries = manifest.fetch("items")
      validate_manifest(entries)

      posts = site.posts.docs.group_by { |post| post.data.fetch("uid").to_s }
      projects = site.data.fetch("project_cache").to_h do |project|
        [project.fetch("repository"), project]
      end
      publications = site.data.fetch("publications").to_h do |publication|
        [publication.fetch("key"), publication]
      end

      localized = LANGUAGES.to_h do |language|
        items = entries.filter_map do |entry|
          resolve(entry, language, posts, projects, publications)
        end
        [language, sort_items(items)]
      end

      unresolved = entries.reject do |entry|
        LANGUAGES.any? do |language|
          localized.fetch(language).any? { |item| item.fetch("id") == entry.fetch("id") }
        end
      end
      raise ArgumentError, "home feed references unresolved items: #{unresolved.map { |item| item.fetch('id') }.join(', ')}" unless unresolved.empty?

      recent_ids = localized.values.flat_map { |items| items.first(8).map { |item| item.fetch("id") } }.uniq
      common_ids = localized.fetch("zh").map { |item| item.fetch("id") } &
                   localized.fetch("en").map { |item| item.fetch("id") }
      rotation_ids = (common_ids - recent_ids).sort
      raise ArgumentError, "home feed needs at least one bilingual rotation item outside both recent lists" if rotation_ids.empty?

      site.data["home_feed_runtime"] = LANGUAGES.to_h do |language|
        by_id = localized.fetch(language).to_h { |item| [item.fetch("id"), item] }
        rotation = rotation_ids.map { |id| by_id.fetch(id) }
        [
          language,
          {
            "recent" => localized.fetch(language).first(8),
            "recent_ids" => localized.fetch(language).first(8).map { |item| item.fetch("id") },
            "rotation" => rotation,
            "rotation_fallback" => rotation.first,
          },
        ]
      end
    end

    def validate_manifest(entries)
      raise ArgumentError, "home feed items must be a non-empty list" unless entries.is_a?(Array) && !entries.empty?

      ids = entries.map do |item|
        unless item.is_a?(Hash) && item.keys.sort == ITEM_KEYS.sort
          raise ArgumentError, "home feed items must contain exactly #{ITEM_KEYS.join(', ')}"
        end
        raise ArgumentError, "unknown home feed kind: #{item['kind']}" unless KINDS.include?(item.fetch("kind"))

        expected_id = "#{item.fetch('kind')}:#{item.fetch('ref')}"
        raise ArgumentError, "home feed id must be #{expected_id}" unless item.fetch("id") == expected_id

        Date.iso8601(item.fetch("feed_date").to_s)
        item.fetch("id")
      rescue Date::Error
        raise ArgumentError, "invalid home feed date for #{item['id']}"
      end
      duplicates = ids.tally.select { |_id, count| count > 1 }.keys
      raise ArgumentError, "duplicate home feed ids: #{duplicates.join(', ')}" unless duplicates.empty?
    end

    def resolve(entry, language, posts, projects, publications)
      base = {
        "id" => entry.fetch("id"),
        "kind" => entry.fetch("kind"),
        "lang" => language,
        "feed_date" => entry.fetch("feed_date").to_s,
      }

      case entry.fetch("kind")
      when "writing"
        post = Array(posts[entry.fetch("ref").to_s]).find { |candidate| candidate.data["lang"] == language }
        return unless post

        base.merge(
          "title" => post.data.fetch("title"),
          "summary" => post.data["description"] || post.data.fetch("excerpt"),
          "url" => post.url,
          "thumbnail" => post.data["thumbnail"],
          "external" => false,
        )
      when "project"
        project = projects.fetch(entry.fetch("ref"))
        source = project.fetch("source")
        description = if source.fetch("locale") == language
                        source.fetch("description")
                      else
                        project.dig("translations", language, "description")
                      end
        return unless description

        base.merge(
          "title" => entry.fetch("ref").split("/").last,
          "summary" => description,
          "url" => "https://github.com/#{entry.fetch('ref')}",
          "thumbnail" => nil,
          "external" => true,
        )
      when "publication"
        publication = publications.fetch(entry.fetch("ref"))
        title = publication.fetch("title").fetch(language)
        authors = publication.fetch("authors").fetch(language).join(", ")
        venue = publication.fetch("venue").fetch(language)
        base.merge(
          "title" => title,
          "summary" => "#{authors} · #{venue} · #{publication.fetch('year')}",
          "url" => "#{language == 'en' ? '/en' : ''}/publications/##{entry.fetch('ref')}",
          "thumbnail" => nil,
          "external" => false,
        )
      end
    rescue KeyError => error
      raise ArgumentError, "cannot resolve #{entry.fetch('id')} for #{language}: #{error.message}"
    end

    def sort_items(items)
      items.sort_by do |item|
        [-Date.iso8601(item.fetch("feed_date")).jd, item.fetch("id")]
      end
    end
  end
end

# Order each post's own tags by their language-local frequency. Equal-frequency
# tags keep the author's original front-matter order.
Jekyll::Hooks.register :site, :post_read do |site|
  frequencies = Hash.new { |languages, language| languages[language] = Hash.new(0) }

  site.posts.docs.each do |post|
    language = post.data["lang"] || site.config["lang"]
    Array(post.data["tags"]).each { |tag| frequencies[language][tag] += 1 }
  end

  site.posts.docs.each do |post|
    language = post.data["lang"] || site.config["lang"]
    indexed_tags = Array(post.data["tags"]).each_with_index.to_a
    ordered = indexed_tags.sort_by do |tag, original_index|
      [-frequencies[language][tag], original_index]
    end
    post.data["sorted_tags"] = ordered.map(&:first)
  end

  Yiyuiii::HomeFeed.build(site)
end
