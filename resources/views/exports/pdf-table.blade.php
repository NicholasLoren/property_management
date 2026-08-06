<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        body {
            font-family: sans-serif;
            font-size: 11px;
            color: #13181a;
        }
        .brand-header {
            background-color: {{ $accentColor }};
            color: #ffffff;
            padding: 10px 14px;
            font-size: 13px;
            font-weight: bold;
            text-transform: uppercase;
            margin: 0 0 16px;
        }
        h1 {
            font-size: 16px;
            margin: 0 0 4px;
        }
        p.meta {
            margin: 0 0 16px;
            color: #576057;
            font-size: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            text-align: left;
            padding: 6px 8px;
            border-bottom: 1px solid #dbe0d9;
        }
        th {
            background-color: #eef1ed;
            color: {{ $accentColor }};
            font-weight: 600;
        }
    </style>
</head>
<body>
    <p class="brand-header">{{ $headerText }}</p>
    <h1>{{ $title }}</h1>
    <p class="meta">Exported {{ now()->setTimezone(app(\App\Settings\GeneralSettings::class)->timezone)->toDayDateTimeString() }} &middot; {{ count($rows) }} {{ Str::plural('record', count($rows)) }}</p>

    <table>
        <thead>
            <tr>
                @foreach ($headings as $heading)
                    <th>{{ $heading }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse ($rows as $row)
                <tr>
                    @foreach ($row as $cell)
                        <td>{{ $cell }}</td>
                    @endforeach
                </tr>
            @empty
                <tr>
                    <td colspan="{{ count($headings) }}">No records.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
