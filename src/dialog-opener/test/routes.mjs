const PAGE_PATH = "/src/dialog-opener/test/backend/page";

export default function (app) {
  app.get("/src/dialog-opener/test/backend/form", (req, res) => {
    const { commit, first_name = "", last_name = "" } = req.query;

    if (commit) {
      if (!first_name.trim()) {
        // Validation error: re-render form with error
        return res.send(formHTML({ first_name, last_name, error: "First name is required" }));
      }
      // Success: redirect back to opener — pwc_done_with carries the result
      const url = new URL(PAGE_PATH, `${req.protocol}://${req.get("host")}`);
      url.searchParams.set("pwc_done_with", `${first_name} ${last_name}`.trim());
      return res.redirect(url.toString());
    }

    // Initial render
    res.send(formHTML({ first_name, last_name, error: null }));
  });

  app.get(PAGE_PATH, (req, res) => {
    const name = req.query.pwc_done_with || "";
    res.send(pageHTML({ name }));
  });
}

function pageHTML({ name }) {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <pwc-dialog-opener id="backend-demo" hoist-actions="submit" local-reload>
      <a href="/src/dialog-opener/test/backend/form">Open</a><br>
      Hello ${esc(name)}
    </pwc-dialog-opener>
  </body>
</html>`;
}

function formHTML({ first_name, last_name, error }) {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>Backend form</title></head>
  <body>
    <h1>Backend form</h1>
    ${error ? `<p class="error" style="color:red">${esc(error)}</p>` : ""}
    <form method="get" action="/src/dialog-opener/test/backend/form">
      <label>First name: <input name="first_name" value="${escapeAttr(first_name)}" /></label><br />
      <label>Last name: <input name="last_name" value="${escapeAttr(last_name)}" /></label><br />
      <button type="submit" name="commit" value="ok">OK</button>
    </form>
  </body>
</html>`;
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
