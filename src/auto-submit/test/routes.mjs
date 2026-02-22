export default function (app) {
  app.get("/src/auto-submit/test/backend/form", (req, res) => {
    const { first, last, color } = req.query;
    res.send(formHTML({ first, last, color }));
  });
}

function formHTML({ first, last, color }) {
  const computed = `${first} ${last}`;
  return `<!doctype html>
<html>
<head><meta charset="utf-8" /></head>
<body>
  <pwc-auto-submit id="as-backend" local-reload>
    <form method="get" action="/src/auto-submit/test/backend/form">
      <label for="first">First</label><br>
      <input id="first" name="first" value="${esc(first)}"><br><br>
      <label for="last">Last (with <code>data-auto-submit</code>)</label><br>
      <input id="last" name="last" value="${esc(last)}" data-auto-submit><br><br>
      <label for="color">Color</label><br>
      <input id="color" name="color" value="${esc(color)}"><br><br>
      <label for="readonly-computed">Readonly computed</label><br>
      <input id="readonly-computed" name="readonly_computed" value="${esc(computed)}" readonly><br><br>
      <label for="forced">Forced (data-pwc-force-value)</label><br>
      <input id="forced" name="forced" value="FORCED" data-pwc-force-value>
    </form>
  </pwc-auto-submit>
</body>
</html>`;
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
