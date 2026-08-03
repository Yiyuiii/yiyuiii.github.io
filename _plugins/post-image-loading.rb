# frozen_string_literal: true

# Markdown images belong to the article body, below the separately rendered
# eager cover.  Add native browser hints after Markdown conversion so old
# bilingual source files do not need repetitive presentation attributes.
Jekyll::Hooks.register :posts, :post_convert do |post|
  post.content = post.content.gsub(/<img\b[^>]*>/i) do |tag|
    rewritten = tag
    unless rewritten.match?(/\sloading\s*=/i)
      rewritten = rewritten.sub(/\A<img\b/i, '<img loading="lazy"')
    end
    unless rewritten.match?(/\sdecoding\s*=/i)
      rewritten = rewritten.sub(/\A<img\b/i, '<img decoding="async"')
    end
    rewritten
  end
end
