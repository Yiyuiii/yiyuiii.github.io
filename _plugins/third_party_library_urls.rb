# frozen_string_literal: true

module Yiyuiii
  module ThirdPartyLibraryUrls
    VERSION_TOKEN = "{{version}}"

    def self.expand(value, version)
      case value
      when Hash
        value.transform_values { |nested| expand(nested, version) }
      when String
        value.gsub(VERSION_TOKEN, version.to_s)
      else
        value
      end
    end
  end
end

Jekyll::Hooks.register :site, :after_init do |site|
  libraries = site.config.fetch("third_party_libraries", {})

  if libraries["download"]
    raise "third_party_libraries.download is unsupported; commit reviewed local assets instead"
  end

  libraries.each do |name, library|
    next if name == "download" || !library.is_a?(Hash) || !library.key?("url")

    library["url"] = Yiyuiii::ThirdPartyLibraryUrls.expand(library["url"], library["version"])
  end
end
