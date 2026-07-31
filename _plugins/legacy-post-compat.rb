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
