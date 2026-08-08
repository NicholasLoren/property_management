<?php

namespace App\Notifications\Concerns;

interface HasSmsBody
{
    /**
     * Kept to a single SMS segment (~150 chars) — sent directly through
     * AfricasTalkingSmsService rather than as a real notification channel.
     */
    public function smsBody(): string;
}
