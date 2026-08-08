from pathlib import Path

import yaml

from scss_source import aggregate_scss_source


ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def main_scss():
    return aggregate_scss_source(
        ROOT / "assets" / "css" / "main.scss",
        load_paths=(ROOT / "_sass",),
    )


def frontmatter(path):
    source = text(path)
    return yaml.safe_load(source.split("---", 2)[1])


def test_project_entry_separates_repository_link_from_native_metadata_filters():
    include = text("_includes/project-list.liquid")

    assert '<section class="project-list"' in include
    assert "data-filter-list" in include
    assert '<article class="project-entry"' in include
    assert "data-filter-entry" in include
    assert "data-tags=" in include
    assert include.count('class="project-tag"') == 2
    assert 'class="project-main"' in include
    assert "text.urls.github" in include
    assert include.count("url_encode") >= 2
    assert 'target="_blank"' in include
    assert 'rel="noopener noreferrer"' in include
    assert "project.name" in include
    assert "project.descriptions[page.lang]" in include
    assert "project.stars" in include
    assert "project.forks" in include
    assert "project.license" in include
    assert "data-filter-empty" in include
    for forbidden in ("README", "category", "work-arrow"):
        assert forbidden not in include


def test_project_tag_filters_use_only_runtime_language_and_license():
    include = text("_includes/project-list.liquid")

    assert "project.language" in include
    assert "project.license" in include
    assert "project.updated_at" not in include
    assert "project.category" not in include
    assert "project.tags" not in include


def test_publication_index_is_manual_and_not_scholar_generated():
    include = text("_includes/publication-list.liquid")
    page = text("_pages/publications.md")
    data = yaml.safe_load(text("_data/publications.yml"))

    assert len(data) == 8
    assert "site.data.publications" in include
    assert "publication.title[page.lang]" in include
    assert "publication.authors[page.lang]" in include
    assert "publication.venue[page.lang]" in include
    assert "for author in publication.authors[page.lang]" in include
    assert 'class="publication-self"' in include
    assert "Yiyu Chen" in include
    assert "陈奕宇" in include
    assert "| join: ', '" not in include
    assert "已发表" not in include
    assert "{% bibliography" not in include + page
    assert "bib_search" not in include + page
    assert "TACO" not in include + page


def test_project_and_paper_indexes_have_bilingual_routes():
    expected = {
        "_pages/projects.md": ("/projects/", "zh", "GitHub"),
        "_pages/projects.en.md": ("/en/projects/", "en", "GitHub"),
        "_pages/publications.md": ("/publications/", "zh", "论文"),
        "_pages/publications.en.md": ("/en/publications/", "en", "Papers"),
    }

    for path, values in expected.items():
        data = frontmatter(path)
        assert (data["permalink"], data["lang"], data["title"]) == values
        assert data["hide_title"] is True


def test_project_and_publication_indexes_share_writing_metadata_primitives():
    project = text("_includes/project-list.liquid")
    publication = text("_includes/publication-list.liquid")
    css = main_scss()

    for include in (project, publication):
        assert 'class="entry-meta index-meta"' in include
        assert 'class="entry-rule"' in include
        assert 'class="index-meta__lead"' in include
        assert 'class="index-meta__tail"' in include
    assert ".publication-self" in css
    index_styles = css[
        css.index(".project-entry + .project-entry") : css.index(".article-shell")
    ]
    assert "border-top: 1px solid var(--divider)" not in index_styles


def test_unused_academic_and_project_detail_routes_are_disabled():
    assert frontmatter("_pages/research.md")["published"] is False
    assert not (ROOT / "_pages" / "cv.md").exists()
    assert not (ROOT / "_data" / "cv.yml").exists()
    assert not (ROOT / "_bibliography" / "papers.bib").exists()
    assert not list((ROOT / "_projects").glob("*.md"))

    config = yaml.safe_load(text("_config.yml"))
    assert "projects" not in config.get("collections", {})
    assert "scholar" not in config
