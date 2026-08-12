<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Upload too large &mdash; {{ config('app.name') }}</title>
    <style>
        :root { color-scheme: light dark; }
        * { box-sizing: border-box; }
        html, body { height: 100%; margin: 0; }
        body {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 24px;
            font-family: 'IBM Plex Sans', ui-sans-serif, system-ui, -apple-system, sans-serif;
            background: #f5f6f3;
            color: #13181a;
        }
        @media (prefers-color-scheme: dark) {
            body { background: #121613; color: #eef2ed; }
        }
        .wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            max-width: 440px;
            gap: 24px;
        }
        .art { width: 100%; max-width: 340px; }
        .art img { display: block; width: 100%; height: auto; }
        .eyebrow {
            font-size: 13px;
            font-weight: 600;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: #b3492f;
        }
        @media (prefers-color-scheme: dark) {
            .eyebrow { color: #e08a72; }
        }
        h1 {
            margin: 0;
            font-size: 22px;
            font-weight: 800;
            letter-spacing: -0.01em;
        }
        p {
            margin: 0;
            font-size: 14px;
            line-height: 1.6;
            color: #576057;
        }
        @media (prefers-color-scheme: dark) {
            p { color: #a9b3a6; }
        }
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 10px 22px;
            border-radius: 10px;
            background: #1f6f60;
            color: #f5f6f3;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
        }
        .btn:hover { opacity: 0.92; }
        @media (prefers-color-scheme: dark) {
            .btn { background: #4fbfa4; color: #121613; }
        }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="art">
            <img src="/images/maintenance_web.svg" alt="Upload too large" width="1920" height="1080">
        </div>
        <div>
            <p class="eyebrow">Error 413</p>
            <h1>That upload was too large</h1>
        </div>
        <p>The file (or files) you tried to submit were too large for the server to accept. Go back, remove or shrink some files, and try again.</p>
        <a class="btn" href="/">Back to home</a>
    </div>
</body>
</html>
