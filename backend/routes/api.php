<?php

use App\Http\Controllers\Api\CardController;
use App\Http\Controllers\Api\BiometricController;
use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MapController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\MemberCardController;
use App\Http\Controllers\Api\MemberController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ReferenceController;
use App\Http\Controllers\Api\StatisticsController;
use App\Http\Controllers\Api\StructureController;
use App\Http\Controllers\Api\TerritoryController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VerificationController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Routes publiques
|--------------------------------------------------------------------------
| Chaque route publique est bornée en débit : l'inscription et la vérification
| sont les deux surfaces exposées à l'extérieur.
*/

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:6,1');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('login-fingerprint', [AuthController::class, 'loginFingerprint'])->middleware('throttle:10,1');
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
    Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:6,1');
});

// Biométrie contextuelle (WebAuthn) — options / assertion publiques pour LOGIN & VERIFICATION
Route::prefix('biometrics')->middleware('throttle:30,1')->group(function () {
    Route::post('member-enroll/options', [BiometricController::class, 'memberEnrollmentOptions']);
    Route::post('authenticate/options', [BiometricController::class, 'authenticationOptions']);
    Route::post('authenticate', [BiometricController::class, 'authenticate']);
});

Route::middleware('throttle:30,1')->group(function () {
    Route::post('members/verify', [VerificationController::class, 'verify']);
    Route::post('members/verify-fingerprint', [VerificationController::class, 'verifyFingerprint']);
    Route::get('verify/{token}', [VerificationController::class, 'verifyByToken'])
        ->where('token', '[A-Za-z0-9]{16,64}');
    Route::get('verify/{token}/photo', [MediaController::class, 'verificationPhoto'])
        ->where('token', '[A-Za-z0-9]{16,64}')
        ->name('media.verification-photo');
});

Route::get('references', [ReferenceController::class, 'index']);

Route::prefix('territories')->group(function () {
    Route::get('provinces', [TerritoryController::class, 'provinces']);
    Route::get('cities', [TerritoryController::class, 'cities']);
    Route::get('communes', [TerritoryController::class, 'communes']);
    Route::get('zones', [TerritoryController::class, 'zones']);
    Route::get('structures', [TerritoryController::class, 'structures']);
});

/*
|--------------------------------------------------------------------------
| Routes authentifiées
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'account.active'])->group(function () {

    // ------------------------------------------------------------ Compte
    Route::prefix('auth')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('logout-all', [AuthController::class, 'logoutAll']);
        Route::post('change-password', [AuthController::class, 'changePassword'])->middleware('throttle:6,1');
    });

    // ------------------------------------------------------------ Biométrie WebAuthn (configuration)
    Route::prefix('biometrics')->group(function () {
        Route::get('credentials', [BiometricController::class, 'index']);
        Route::post('register/options', [BiometricController::class, 'registrationOptions']);
        Route::post('register', [BiometricController::class, 'register']);
        Route::delete('credentials/{credential}', [BiometricController::class, 'destroy']);
    });

    // ------------------------------------------------------------ Cartes (registre global)
    Route::prefix('cards')->group(function () {
        Route::middleware('permission:cards.view')->group(function () {
            Route::get('/', [CardController::class, 'index']);
            Route::get('visual', [CardController::class, 'visual']);
        });
        Route::post('{card}/regenerate', [CardController::class, 'regenerate'])
            ->middleware('permission:cards.issue');
        Route::post('{card}/revoke', [CardController::class, 'revoke'])
            ->middleware('permission:cards.revoke');
    });

    // ------------------------------------------------------------ Membres
    Route::prefix('members')->group(function () {
        Route::get('/', [MemberController::class, 'index'])
            ->middleware('permission:members.view');

        Route::post('/', [MemberController::class, 'store'])
            ->middleware('permission:members.create');

        Route::get('export', [MemberController::class, 'export'])
            ->middleware(['permission:members.export', 'throttle:10,1']);

        Route::post('check-duplicates', [MemberController::class, 'checkDuplicates'])
            ->middleware('permission:members.view');

        Route::get('{member}', [MemberController::class, 'show']);
        Route::match(['put', 'patch'], '{member}', [MemberController::class, 'update']);
        Route::post('{member}', [MemberController::class, 'update']); // multipart + _method
        Route::delete('{member}', [MemberController::class, 'destroy']);

        Route::get('{member}/timeline', [MemberController::class, 'timeline']);
        Route::post('{member}/validate', [MemberController::class, 'validateMember']);
        Route::post('{member}/status', [MemberController::class, 'changeStatus']);

        // Cartes et QR codes
        Route::get('{member}/cards', [MemberCardController::class, 'index']);
        Route::get('{member}/card', [MemberCardController::class, 'show']);
        Route::post('{member}/card', [MemberCardController::class, 'store']);
        Route::get('{member}/qr', [MemberCardController::class, 'qr']);
        Route::post('{member}/cards/{card}/revoke', [MemberCardController::class, 'revoke']);
    });

    // ------------------------------------------------------------ Structures
    Route::get('territories/tree', [TerritoryController::class, 'tree'])
        ->middleware('permission:structures.view');
    Route::post('structures/{structure}/disable', [StructureController::class, 'disable']);
    Route::apiResource('structures', StructureController::class);

    // ------------------------------------------------------------ Activités & présences
    Route::apiResource('activities', ActivityController::class);

    Route::prefix('activities/{activity}')->group(function () {
        Route::get('participants', [ActivityController::class, 'participants']);
        Route::post('participants', [ActivityController::class, 'addParticipants']);
        Route::delete('participants/{member}', [ActivityController::class, 'removeParticipant']);

        Route::get('attendance', [AttendanceController::class, 'index']);
        Route::get('attendance/sheet', [AttendanceController::class, 'sheet']);
        Route::post('attendance', [AttendanceController::class, 'store']);
        Route::patch('attendance/{attendance}', [AttendanceController::class, 'update']);
    });

    // ------------------------------------------------------------ Pilotage
    Route::prefix('statistics')->middleware('permission:statistics.view')->group(function () {
        Route::get('/', [StatisticsController::class, 'overview']);
        Route::get('charts', [StatisticsController::class, 'charts']);
        Route::get('by-province', [StatisticsController::class, 'byProvince']);
        Route::get('by-city', [StatisticsController::class, 'byCity']);
        Route::get('by-commune', [StatisticsController::class, 'byCommune']);
    });

    Route::prefix('map')->middleware('permission:map.view')->group(function () {
        Route::get('statistics', [MapController::class, 'statistics']);
        Route::get('config', [MapController::class, 'config']);
    });

    // ------------------------------------------------------------ Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('unread-count', [NotificationController::class, 'unreadCount']);
        Route::post('read-all', [NotificationController::class, 'markAllAsRead']);
        Route::post('{notification}/read', [NotificationController::class, 'markAsRead']);
        Route::delete('{notification}', [NotificationController::class, 'destroy']);
    });

    // ------------------------------------------------------------ Administration
    Route::middleware('permission:users.view')->get('roles', [UserController::class, 'roles']);
    Route::apiResource('users', UserController::class);

    Route::prefix('audit')->middleware('permission:audit.view')->group(function () {
        Route::get('/', [AuditLogController::class, 'index']);
        Route::get('verifications', [AuditLogController::class, 'verifications']);
    });

    // ------------------------------------------------------------ Médias protégés
    Route::get('media/members/{member}/photo', [MediaController::class, 'memberPhoto'])
        ->name('media.member-photo');
});
