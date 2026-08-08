<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Page not found &mdash; {{ config('app.name') }}</title>
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
            max-width: 460px;
            gap: 20px;
        }
        .art { width: 100%; max-width: 420px; }
        .art img { display: block; width: 100%; height: auto; }
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
            <img src="/images/404_error.svg" alt="Page not found" width="1600" height="1300">
        </div>
        <p>The page you're looking for doesn't exist, or may have moved. Double-check the link, or head back home.</p>
        <a class="btn" href="/">Back to home</a>
    </div>
</body>
</html>
