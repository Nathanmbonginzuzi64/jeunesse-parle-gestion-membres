@echo off
cd /d "%~dp0"
php -c php-local.ini artisan serve
