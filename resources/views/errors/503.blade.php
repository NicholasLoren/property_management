<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="refresh" content="60">
    <title>Down for maintenance &mdash; {{ config('app.name') }}</title>
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
            color: #1f6f60;
        }
        @media (prefers-color-scheme: dark) {
            .eyebrow { color: #4fbfa4; }
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
        .note {
            font-size: 12px;
            color: #8a9188;
        }
        @media (prefers-color-scheme: dark) {
            .note { color: #717a70; }
        }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="art">
            <img src="/images/maintenance_web.svg" alt="Down for maintenance" width="1920" height="1080">
        </div>
        <div>
            <p class="eyebrow">Scheduled maintenance</p>
            <h1>We'll be right back</h1>
        </div>
        <p>{{ config('app.name') }} is undergoing scheduled maintenance. We won't be long &mdash; thanks for your patience.</p>
        <p class="note">This page refreshes automatically.</p>
    </div>
</body>
</html>
