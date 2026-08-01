# frozen_string_literal: true

# Keep the original Chirpy-era post files untouched while adapting the small
# front-matter differences expected by al-folio at build time.
Jekyll::Hooks.register :posts, :pre_render do |post|
  if post.data["mermaid"] == true
    post.data["mermaid"] = {
      "enabled" => true,
      "zoomable" => true,
    }
  end

  description = post.data["description"]
  excerpt = post.data["excerpt"]
  post.data["description"] = excerpt.strip if (description.nil? || description.empty?) && excerpt.is_a?(String) && !excerpt.strip.empty?
end

# jekyll-archives-v2 keeps historical taxonomy URLs unprefixed. Prefer the
# Chinese side when a taxonomy contains both languages, but retain English-only
# legacy archives instead of rendering an empty Chinese page.
Jekyll::Hooks.register :pages, :pre_render do |page|
  next unless page.data["layout"] == "archive" && page.respond_to?(:documents)

  documents = page.documents
  next unless documents.respond_to?(:any?)

  page.data["lang"] = documents.any? { |document| document.data["lang"] == "zh" } ? "zh" : "en"
end
