source 'https://rubygems.org'

gem 'jekyll', '= 4.4.1'

# Windows does not ship an IANA zoneinfo directory. Keep Jekyll's configured
# timezone available for local production builds without affecting Linux CI.
gem 'tzinfo-data', platforms: %i[mingw x64_mingw mswin]

# Core plugins that directly affect site building
group :jekyll_plugins do
    gem 'jekyll-archives-v2'
    gem 'jekyll-cache-bust'
    gem 'jekyll-email-protect'
    gem 'jekyll-feed'
    gem 'jekyll-link-attributes'
    gem 'jekyll-minifier'
    gem 'jekyll-regex-replace'
    gem 'jekyll-sitemap'
    gem 'jekyll-socials'
    gem 'jekyll-tabs'
    gem 'jekyll-terser', :git => "https://github.com/RobertoJBeltran/jekyll-terser.git", :ref => "1085bf66d692799af09fe39f8162a1e6e42a3cc4"
    gem 'jekyll-3rd-party-libraries', '= 0.0.1'
    gem 'jekyll-toc'
    gem 'jemoji'
end

# Theme and active al-folio extensions
group :al_folio_plugins do
    gem 'al_folio_core', '= 1.0.11'
    gem 'al_charts', '= 1.0.1'
    gem 'al_math', '= 1.0.1'
end
