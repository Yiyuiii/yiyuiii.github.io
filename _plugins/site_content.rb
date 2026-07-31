# frozen_string_literal: true

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
end
