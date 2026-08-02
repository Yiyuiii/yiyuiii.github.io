# frozen_string_literal: true

require "date"

module Yiyuiii
  module HomeFeed
    LANGUAGES = %w[zh en].freeze
    ITEM_KEYS = %w[id kind ref].freeze
    DATE_MARKER_KEYS = %w[date precision source_field source_url].freeze
    DATE_PRECISIONS = %w[day year].freeze
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
      project_records = site.data.fetch("project_repositories").to_h do |project|
        [project.fetch("repository"), project]
      end
      publications = site.data.fetch("publications").to_h do |publication|
        [publication.fetch("key"), publication]
      end

      localized = LANGUAGES.to_h do |language|
        items = entries.filter_map do |entry|
          resolve(entry, language, posts, projects, project_records, publications)
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

        item.fetch("id")
      end
      duplicates = ids.tally.select { |_id, count| count > 1 }.keys
      raise ArgumentError, "duplicate home feed ids: #{duplicates.join(', ')}" unless duplicates.empty?
    end

    def resolve(entry, language, posts, projects, project_records, publications)
      base = {
        "id" => entry.fetch("id"),
        "kind" => entry.fetch("kind"),
        "lang" => language,
      }

      case entry.fetch("kind")
      when "writing"
        post = Array(posts[entry.fetch("ref").to_s]).find { |candidate| candidate.data["lang"] == language }
        return unless post

        base.merge(
          writing_marker(post),
          "title" => post.data.fetch("title"),
          "summary" => post.data["description"] || post.data.fetch("excerpt"),
          "url" => post.url,
          "thumbnail" => post.data["thumbnail"],
          "external" => false,
        )
      when "project"
        project = projects.fetch(entry.fetch("ref"))
        project_record = project_records.fetch(entry.fetch("ref"))
        source = project.fetch("source")
        description = if source.fetch("locale") == language
                        source.fetch("description")
                      else
                        project.dig("translations", language, "description")
                      end
        return unless description

        base.merge(
          normalize_marker(project_record.fetch("created"), entry.fetch("id"), "created"),
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
          normalize_marker(publication.fetch("first_public"), entry.fetch("id"), "first_public"),
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

    def writing_marker(post)
      post_date = exact_day(post.data.fetch("date"), "writing:#{post.data.fetch('uid')}")
      revisions = post.data["revisions"]
      return runtime_date(post_date, "day") if revisions.nil?

      unless revisions.is_a?(Array) && !revisions.empty?
        raise ArgumentError, "writing:#{post.data.fetch('uid')} revisions must be a non-empty list"
      end

      first_revision = revisions.first
      unless first_revision.is_a?(Hash) && first_revision.key?("date")
        raise ArgumentError, "writing:#{post.data.fetch('uid')} first revision has no date"
      end

      first_date = exact_day(first_revision.fetch("date"), "writing:#{post.data.fetch('uid')}")
      unless first_date == post_date
        raise ArgumentError,
              "writing:#{post.data.fetch('uid')} first revision #{first_date} does not match post date #{post_date}"
      end

      runtime_date(first_date, "day")
    end

    def normalize_marker(record, item_id, field_name)
      unless record.is_a?(Hash) && record.keys.sort == DATE_MARKER_KEYS.sort
        raise ArgumentError,
              "#{item_id} #{field_name} must contain exactly #{DATE_MARKER_KEYS.join(', ')}"
      end

      precision = record.fetch("precision").to_s
      unless DATE_PRECISIONS.include?(precision)
        raise ArgumentError, "#{item_id} has unknown marker precision: #{precision}"
      end
      unless record.fetch("source_url").to_s.start_with?("https://") &&
             !record.fetch("source_field").to_s.strip.empty?
        raise ArgumentError, "#{item_id} #{field_name} needs an HTTPS source and source field"
      end

      raw_date = record.fetch("date").to_s
      if precision == "day"
        raw_date = exact_day(raw_date, item_id)
      elsif !raw_date.match?(/\A\d{4}\z/)
        raise ArgumentError, "#{item_id} year-precision date must be YYYY"
      end
      runtime_date(raw_date, precision)
    end

    def runtime_date(value, precision)
      {
        "marker_date" => value,
        "marker_precision" => precision,
      }
    end

    def exact_day(value, item_id)
      raw = value.respond_to?(:strftime) ? value.strftime("%Y-%m-%d") : value.to_s
      raise Date::Error unless raw.match?(/\A\d{4}-\d{2}-\d{2}\z/)
      Date.iso8601(raw).iso8601
    rescue Date::Error
      raise ArgumentError, "invalid marker date for #{item_id}: #{raw}"
    end

    def sort_items(items)
      items.sort_by do |item|
        value = item.fetch("marker_date")
        components = if item.fetch("marker_precision") == "day"
                       date = Date.iso8601(value)
                       [date.year, date.month, date.day]
                     else
                       [Integer(value, 10), 0, 0]
                     end
        [-components[0], -components[1], -components[2], item.fetch("id")]
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
