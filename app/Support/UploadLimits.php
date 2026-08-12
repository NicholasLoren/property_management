<?php

namespace App\Support;

class UploadLimits
{
    /**
     * The photo/image business limit, in kilobytes, that the app would
     * like to allow. The actual enforced limit is the smaller of this
     * and whatever the PHP runtime will accept, so validation never
     * advertises a size it can't actually receive (php.ini's
     * upload_max_filesize truncates oversized files before Laravel's
     * validator ever runs, producing a confusing "failed to upload"
     * error instead of a clear size message).
     */
    public static function photoMaxKb(): int
    {
        return min(5120, self::phpUploadMaxKb());
    }

    /**
     * The document business limit, in kilobytes.
     */
    public static function documentMaxKb(): int
    {
        return min(5120, self::phpUploadMaxKb());
    }

    public static function photoMaxMb(): float
    {
        return round(self::photoMaxKb() / 1024, 2);
    }

    public static function documentMaxMb(): float
    {
        return round(self::documentMaxKb() / 1024, 2);
    }

    /**
     * The largest request body PHP will accept, in megabytes. Unlike
     * photoMaxMb()/documentMaxMb(), this isn't clamped to a 5 GB business
     * ceiling — it's the true php.ini limit, used by forms that can submit
     * several files at once (e.g. a photo gallery) to warn before a batch
     * would exceed post_max_size. PHP empties $_POST/$_FILES entirely when
     * that happens, and Laravel's ValidatePostSize middleware — which
     * throws on it — runs before the session even starts, so there's no
     * reliable way to surface a friendly error after the fact; the client
     * needs to catch this before submitting.
     */
    public static function postMaxMb(): float
    {
        $postMax = self::parseIniSize((string) ini_get('post_max_size'));

        return round(($postMax > 0 ? $postMax : 8 * 1024 * 1024) / 1024 / 1024, 2);
    }

    /**
     * The largest single file PHP will accept, in kilobytes, given the
     * runtime's upload_max_filesize and post_max_size.
     */
    private static function phpUploadMaxKb(): int
    {
        $uploadMax = self::parseIniSize((string) ini_get('upload_max_filesize'));
        $postMax = self::parseIniSize((string) ini_get('post_max_size'));

        $ceilingBytes = $postMax > 0 ? min($uploadMax, $postMax) : $uploadMax;

        return $ceilingBytes > 0 ? intdiv($ceilingBytes, 1024) : 5120;
    }

    private static function parseIniSize(string $value): int
    {
        $value = trim($value);

        if ($value === '' || $value === '-1') {
            return 0;
        }

        $unit = strtolower(substr($value, -1));
        $number = (float) $value;

        return (int) match ($unit) {
            'g' => $number * 1024 * 1024 * 1024,
            'm' => $number * 1024 * 1024,
            'k' => $number * 1024,
            default => (float) $value,
        };
    }
}
