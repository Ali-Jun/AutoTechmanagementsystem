<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('autotech:about', function (): void {
    $this->info('Auto Tech Management System API');
});
