# Design

The portfolio uses a minimal layout with short, factual copy. Keep the existing
navy and blue colour tokens, Spectral headings and Geist interface type.

- Home: name, degree, project and CV links, one project visual, then a simple
  project list. The hero visual can be replaced independently.
- Use ordinary page names: Projects, CV, About, Personal and Notes.
- Avoid slogans, drawing or sheet numbers, revision labels for the site itself,
  coordinate readouts, decorative watermarks and repeated introductions.
- Keep actual dates, technical specifications, project revisions and sources.
- Prefer whitespace and simple rules to repeated cards or animated diagrams.
- Use a native pointer. Motion should explain an interaction or a loading state.
- Ask SHC appears after the page load and preloader exit. It stays available
  during navigation and opens the existing compact/full-screen chat workspace.
- Keep keyboard focus, readable contrast and reduced-motion support.

The portfolio remains a static Next.js export for GitHub Pages. The chatbot
uses the existing Cloudflare backend; its privacy notice remains explicit.
