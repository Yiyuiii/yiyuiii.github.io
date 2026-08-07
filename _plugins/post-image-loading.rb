# frozen_string_literal: true

require "uri"

# Markdown images belong to the article body, below the separately rendered
# eager cover. Add native browser hints after Markdown conversion so old
# bilingual source files do not need repetitive presentation attributes.
module PostImageLoading
  module_function

  SOF_MARKERS = [
    0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
    0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF
  ].freeze

  def dimensions(path)
    data = File.binread(path)
    return png_dimensions(data) if data.start_with?("\x89PNG\r\n\x1A\n".b)
    return gif_dimensions(data) if data.start_with?("GIF87a".b, "GIF89a".b)
    return jpeg_dimensions(data) if data.start_with?("\xFF\xD8".b)
    return webp_dimensions(data) if data.start_with?("RIFF".b) && data.byteslice(8, 4) == "WEBP".b

    nil
  rescue Errno::ENOENT, Errno::EACCES
    nil
  end

  def png_dimensions(data)
    return nil if data.bytesize < 24

    data.byteslice(16, 8).unpack("NN")
  end

  def gif_dimensions(data)
    return nil if data.bytesize < 10

    data.byteslice(6, 4).unpack("vv")
  end

  def jpeg_dimensions(data)
    position = 2
    while position + 4 <= data.bytesize
      position += 1 while position < data.bytesize && data.getbyte(position) != 0xFF
      position += 1 while position < data.bytesize && data.getbyte(position) == 0xFF
      return nil if position >= data.bytesize

      marker = data.getbyte(position)
      position += 1
      next if marker == 0x01 || (0xD0..0xD9).cover?(marker)
      return nil if position + 2 > data.bytesize

      length = data.byteslice(position, 2).unpack1("n")
      return nil if length < 2 || position + length > data.bytesize
      if SOF_MARKERS.include?(marker) && length >= 7
        height, width = data.byteslice(position + 3, 4).unpack("nn")
        return [width, height]
      end
      position += length
    end
    nil
  end

  def webp_dimensions(data)
    return nil if data.bytesize < 30

    chunk = data.byteslice(12, 4)
    case chunk
    when "VP8X".b
      width = little_endian_24(data.byteslice(24, 3)) + 1
      height = little_endian_24(data.byteslice(27, 3)) + 1
      [width, height]
    when "VP8 ".b
      return nil unless data.byteslice(23, 3) == "\x9D\x01\x2A".b

      width, height = data.byteslice(26, 4).unpack("vv")
      [width & 0x3FFF, height & 0x3FFF]
    when "VP8L".b
      return nil unless data.getbyte(20) == 0x2F

      bits = data.byteslice(21, 4).unpack1("V")
      [(bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1]
    end
  end

  def little_endian_24(bytes)
    bytes.getbyte(0) | (bytes.getbyte(1) << 8) | (bytes.getbyte(2) << 16)
  end

  def local_path(site, source)
    return nil unless source&.start_with?("/") && !source.start_with?("//")

    relative = source.split(/[?#]/, 2).first.delete_prefix("/")
    decoded = URI::DEFAULT_PARSER.unescape(relative)
    candidate = File.expand_path(decoded, site.source)
    root = File.expand_path(site.source)
    return nil unless candidate.start_with?(root + File::SEPARATOR)

    candidate
  end

  def add_dimensions(tag, site)
    return tag if tag.match?(/\swidth\s*=/i) && tag.match?(/\sheight\s*=/i)

    source = tag[/\ssrc\s*=\s*["']([^"']+)["']/i, 1]
    path = local_path(site, source)
    size = path && dimensions(path)
    return tag unless size && size.all?(&:positive?)

    width, height = size
    rewritten = tag
    rewritten = rewritten.sub(/\A<img\b/i, "<img width=\"#{width}\"") unless rewritten.match?(/\swidth\s*=/i)
    rewritten = rewritten.sub(/\A<img\b/i, "<img height=\"#{height}\"") unless rewritten.match?(/\sheight\s*=/i)
    rewritten
  end

  def add_responsive_candidates(tag, site)
    return tag if tag.match?(/\ssrcset\s*=/i)

    source = tag[/\ssrc\s*=\s*["']([^"']+)["']/i, 1]
    source_path = source&.split(/[?#]/, 2)&.first
    records = site.data.dig("article_image_derivatives", "images")
    return tag unless source_path && records.is_a?(Array)

    record = records.find { |item| source_path == asset_url(site, item["published"]) }
    variants = record && record["variants"]
    return tag unless variants.is_a?(Array) && !variants.empty?

    candidates = variants.map do |variant|
      [asset_url(site, variant["asset"]), Integer(variant["width"])]
    end
    published_path = local_path(site, source_path)
    published_size = published_path && dimensions(published_path)
    return tag unless published_size

    candidates << [source_path, published_size.first]
    srcset = candidates.sort_by(&:last).map { |path, width| "#{path} #{width}w" }.join(", ")
    sizes = site.data.dig("article_image_derivatives", "policy", "sizes")
    return tag unless sizes.is_a?(String) && !sizes.empty?

    tag.sub(/\A<img\b/i, "<img srcset=\"#{srcset}\" sizes=\"#{sizes}\"")
  rescue ArgumentError, TypeError
    tag
  end

  def asset_url(site, asset)
    return nil unless asset.is_a?(String) && !asset.empty?

    baseurl = site.config["baseurl"].to_s.sub(%r{/\z}, "")
    "#{baseurl}/#{asset.delete_prefix('/')}"
  end
end

Jekyll::Hooks.register :posts, :post_convert do |post|
  post.content = post.content.gsub(/<img\b[^>]*>/i) do |tag|
    rewritten = PostImageLoading.add_dimensions(tag, post.site)
    rewritten = PostImageLoading.add_responsive_candidates(rewritten, post.site)
    rewritten = rewritten.sub(/\A<img\b/i, '<img loading="lazy"') unless rewritten.match?(/\sloading\s*=/i)
    rewritten = rewritten.sub(/\A<img\b/i, '<img decoding="async"') unless rewritten.match?(/\sdecoding\s*=/i)
    rewritten
  end
end

# The cover is added by the layout after post_convert. Fill its intrinsic
# dimensions after rendering while preserving its explicit eager priority.
Jekyll::Hooks.register :posts, :post_render do |post|
  post.output = post.output.gsub(/<img\b[^>]*>/i) do |tag|
    PostImageLoading.add_dimensions(tag, post.site)
  end
end
