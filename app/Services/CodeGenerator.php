<?php

namespace App\Services;

use App\Models\CodeSequence;
use App\Settings\CodesSettings;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Renders a unique, human-readable code for a model from an admin-configured
 * template (see CodesSettings / the "Codes" company settings tab). Supports
 * four tokens:
 *
 *   {prefix}       the type's configured prefix (e.g. "PROP")
 *   {seq}, {seq:N} an atomically-incremented counter, zero-padded to N
 *                  digits (default 4) — safe under concurrent requests via
 *                  a row lock on code_sequences
 *   {date:FORMAT}  today's date via PHP's date() syntax, e.g. {date:Y}
 *   {id}           the model's own primary key — only resolvable once the
 *                  model has been saved, so usesId() lets a caller know it
 *                  needs a create-then-update-code round trip
 *
 * Any other/malformed token is left as literal text in the output rather
 * than throwing, so a typo'd template degrades instead of breaking creation.
 */
class CodeGenerator
{
    private const array PREFIX_DEFAULTS = [
        'property' => 'PROP',
        'unit' => 'UNIT',
        'document' => 'DOC',
        'expense' => 'EXP',
        'income' => 'INC',
    ];

    private const string DEFAULT_TEMPLATE = '{prefix}-{seq:4}';

    public function __construct(private readonly CodesSettings $settings) {}

    public function generate(string $type, ?Model $model = null): string
    {
        $template = $this->templateFor($type);
        $prefix = $this->prefixFor($type);

        return (string) preg_replace_callback(
            '/\{([a-z]+)(?::([^}]+))?\}/i',
            function (array $matches) use ($type, $prefix, $model) {
                $token = strtolower($matches[1]);
                $arg = $matches[2] ?? null;

                return match ($token) {
                    'prefix' => $prefix,
                    'seq' => $this->nextSequence($type, $arg !== null ? (int) $arg : 4),
                    'date' => now()->format($arg ?: 'Y'),
                    'id' => $model?->getKey() !== null ? (string) $model->getKey() : $this->nextSequence($type, 4),
                    default => $matches[0],
                };
            },
            $template,
        );
    }

    public function usesId(string $type): bool
    {
        return str_contains($this->templateFor($type), '{id}') || str_contains($this->templateFor($type), '{id:');
    }

    private function templateFor(string $type): string
    {
        $template = $this->settings->{"{$type}_template"} ?? null;

        return is_string($template) && $template !== '' ? $template : self::DEFAULT_TEMPLATE;
    }

    private function prefixFor(string $type): string
    {
        $prefix = $this->settings->{"{$type}_prefix"} ?? null;

        return is_string($prefix) && $prefix !== '' ? $prefix : (self::PREFIX_DEFAULTS[$type] ?? strtoupper($type));
    }

    private function nextSequence(string $type, int $pad): string
    {
        $number = DB::transaction(function () use ($type) {
            $sequence = CodeSequence::query()->where('type', $type)->lockForUpdate()->first();

            if ($sequence === null) {
                CodeSequence::query()->firstOrCreate(['type' => $type], ['next_number' => 1]);
                $sequence = CodeSequence::query()->where('type', $type)->lockForUpdate()->first();
            }

            $current = $sequence->next_number;
            $sequence->increment('next_number');

            return $current;
        });

        return str_pad((string) $number, $pad, '0', STR_PAD_LEFT);
    }
}
