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
use App\Http\Controllers\Api\MessagingController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\NotificationPreferenceController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\JpMessageController;
use App\Http\Controllers\Api\NewsController;
use App\Http\Controllers\Api\HomePostController;
use App\Http\Controllers\Api\ReferenceController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\StatisticsController;
use App\Http\Controllers\Api\StructureController;
use App\Http\Controllers\Api\TerritoryController;
use App\Http\Controllers\Api\TerritoryManagementController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\UserPreferenceController;
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
    Route::post('member-enroll/complete', [BiometricController::class, 'memberEnrollmentComplete']);
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

Route::post('contact', [ContactController::class, 'store'])->middleware('throttle:8,1');

Route::get('references', [ReferenceController::class, 'index']);

/** Ping léger pour le mobile (découverte d'URL quand le réseau change). Sans throttle/DB. */
Route::get('health', function () {
    return response()->json([
        'ok' => true,
        'service' => 'jeunesse-parle',
        'time' => now()->toIso8601String(),
    ]);
});

Route::get('public/stats', [StatisticsController::class, 'publicLanding'])->middleware('throttle:60,1');

/** Posts d'actualité publics (distincts de /news). */
Route::prefix('public/home-posts')->group(function () {
    Route::get('/', [HomePostController::class, 'publicIndex'])->middleware('throttle:180,1');
    Route::get('{homePost}/image', [HomePostController::class, 'publicImage'])->middleware('throttle:180,1');
    Route::get('{homePost}', [HomePostController::class, 'publicShow'])->middleware('throttle:180,1');
    Route::post('{homePost}/like', [HomePostController::class, 'publicLike'])->middleware('throttle:60,1');
    Route::post('{homePost}/comments', [HomePostController::class, 'publicComment'])->middleware('throttle:30,1');
});

Route::prefix('territories')->group(function () {
    Route::get('provinces', [TerritoryController::class, 'provinces']);
    Route::get('cities', [TerritoryController::class, 'cities']);
    Route::get('districts', [TerritoryController::class, 'districts']);
    Route::get('communes', [TerritoryController::class, 'communes']);
    Route::get('zones', [TerritoryController::class, 'zones']);
    Route::get('quartiers', [TerritoryController::class, 'quartiers']);
    Route::get('avenues', [TerritoryController::class, 'avenues']);
    Route::get('structures', [TerritoryController::class, 'structures']);
});

/*
|--------------------------------------------------------------------------
| Routes authentifiées
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'account.active', 'session.timeout', 'maintenance'])->group(function () {

    // ------------------------------------------------------------ Compte
    Route::prefix('auth')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
        Route::post('logout-all', [AuthController::class, 'logoutAll']);
        Route::get('sessions', [AuthController::class, 'sessions']);
        Route::delete('sessions/{tokenId}', [AuthController::class, 'destroySession'])->whereNumber('tokenId');
        Route::post('change-password', [AuthController::class, 'changePassword'])->middleware('throttle:6,1');
        Route::post('profile', [AuthController::class, 'updateProfile'])->middleware('throttle:12,1');
        Route::post('structure', [AuthController::class, 'assignStructure'])->middleware('throttle:12,1');
        Route::post('complete-profile', [AuthController::class, 'completeProfile'])->middleware('throttle:12,1');
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

        Route::post('bulk-validate', [MemberController::class, 'bulkValidate'])
            ->middleware('permission:members.validate');

        Route::get('mobile-stats', [MemberController::class, 'mobileStats'])
            ->middleware('permission:members.validate');

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
    Route::middleware('permission:territories.manage')->prefix('territories')->group(function () {
        Route::post('provinces', [TerritoryManagementController::class, 'storeProvince']);
        Route::post('cities', [TerritoryManagementController::class, 'storeCity']);
        Route::post('districts', [TerritoryManagementController::class, 'storeDistrict']);
        Route::post('communes', [TerritoryManagementController::class, 'storeCommune']);
        Route::post('quartiers', [TerritoryManagementController::class, 'storeQuartier']);
        Route::post('zones', [TerritoryManagementController::class, 'storeQuartier']);
        Route::post('avenues', [TerritoryManagementController::class, 'storeAvenue']);
    });
    Route::post('structures/{structure}/disable', [StructureController::class, 'disable']);
    Route::apiResource('structures', StructureController::class);

    // ------------------------------------------------------------ Activités & présences
    Route::get('activities/for-attendance', [ActivityController::class, 'forAttendance']);
    Route::get('activities/for-member', [ActivityController::class, 'forMember']);
    Route::get('activities/{activity}/for-member', [ActivityController::class, 'showForMember']);
    Route::post('activities/{activity}/register', [ActivityController::class, 'registerSelf']);
    Route::get('attendance/agent-presents', [AttendanceController::class, 'agentPresents']);
    Route::get('attendances/for-member', [AttendanceController::class, 'forMember']);
    Route::get('verifications/history', [VerificationController::class, 'history']);
    Route::get('verifications/members', [VerificationController::class, 'verifiedMembers']);
    Route::get('agent/dashboard', [VerificationController::class, 'agentDashboard']);
    Route::apiResource('activities', ActivityController::class);
    Route::post('activities/{activity}', [ActivityController::class, 'update']); // multipart + _method

    Route::prefix('activities/{activity}')->group(function () {
        Route::get('participants', [ActivityController::class, 'participants']);
        Route::post('participants', [ActivityController::class, 'addParticipants']);
        Route::delete('participants/{member}', [ActivityController::class, 'removeParticipant']);

        Route::get('live-location', [ActivityController::class, 'liveLocation']);
        Route::post('live-location/start', [ActivityController::class, 'startLiveLocation']);
        Route::post('live-location/update', [ActivityController::class, 'updateLiveLocation']);
        Route::post('live-location/stop', [ActivityController::class, 'stopLiveLocation']);

        Route::get('attendance', [AttendanceController::class, 'index']);
        Route::get('attendance/sheet', [AttendanceController::class, 'sheet']);
        Route::get('attendance/sheet/export', [AttendanceController::class, 'exportSheet']);
        Route::post('attendance', [AttendanceController::class, 'store']);
        Route::post('attendance/self', [AttendanceController::class, 'storeSelf']);
        Route::post('attendance/fingerprint', [AttendanceController::class, 'storeFingerprint']);
        Route::patch('attendance/{attendance}', [AttendanceController::class, 'update']);
    });

    Route::prefix('news')->group(function () {
        Route::get('manage', [NewsController::class, 'manage']);
        Route::get('stats', [NewsController::class, 'stats']);
        Route::get('categories', [NewsController::class, 'categories']);
        Route::delete('comments/{newsComment}', [NewsController::class, 'deleteComment']);
        Route::patch('comments/{newsComment}', [NewsController::class, 'updateComment']);
        Route::post('comments/{newsComment}/like', [NewsController::class, 'likeComment']);
        Route::get('/', [NewsController::class, 'index']);
        Route::post('/', [NewsController::class, 'store']);
        Route::post('{newsPost}/restore', [NewsController::class, 'restore']);
        Route::post('{newsPost}/react', [NewsController::class, 'react']);
        Route::post('{newsPost}/comments', [NewsController::class, 'comment']);
        Route::post('{newsPost}/share', [NewsController::class, 'share']);
        Route::get('{newsPost}', [NewsController::class, 'show']);
        Route::match(['put', 'post'], '{newsPost}', [NewsController::class, 'update']);
        Route::delete('{newsPost}', [NewsController::class, 'destroy']);
    });

    Route::prefix('jp-messages')->group(function () {
        Route::get('/', [JpMessageController::class, 'index']);
        Route::post('/', [JpMessageController::class, 'store']);
        Route::get('directory', [MessagingController::class, 'directory']);
        Route::get('unread-count', [MessagingController::class, 'unreadCount']);
        Route::get('chats', [MessagingController::class, 'index']);
        Route::post('chats', [MessagingController::class, 'store'])->middleware('throttle:30,1');
        Route::get('chats/{conversation}', [MessagingController::class, 'show']);
        Route::get('chats/{conversation}/messages', [MessagingController::class, 'messages']);
        Route::post('chats/{conversation}/messages', [MessagingController::class, 'send'])->middleware('throttle:40,1');
        Route::put('chats/{conversation}/messages/{message}', [MessagingController::class, 'updateMessage'])
            ->middleware('throttle:40,1');
        Route::delete('chats/{conversation}/messages/{message}', [MessagingController::class, 'destroyMessage'])
            ->middleware('throttle:40,1');
        Route::post('chats/{conversation}/read', [MessagingController::class, 'read']);
        Route::get('{jpMessage}', [JpMessageController::class, 'show']);
        Route::post('{jpMessage}/replies', [JpMessageController::class, 'reply']);
    });

    // ------------------------------------------------------------ Pilotage
    Route::prefix('statistics')->middleware('permission:statistics.view')->group(function () {
        Route::get('/', [StatisticsController::class, 'overview']);
        Route::get('charts', [StatisticsController::class, 'charts']);
        Route::get('by-province', [StatisticsController::class, 'byProvince']);
        Route::get('by-city', [StatisticsController::class, 'byCity']);
        Route::get('by-commune', [StatisticsController::class, 'byCommune']);
    });

    Route::prefix('reports')->middleware('permission:statistics.view')->group(function () {
        Route::get('/', [ReportController::class, 'hub']);
        Route::get('members', [ReportController::class, 'members']);
        Route::get('members/export', [ReportController::class, 'exportMembers']);
        Route::get('members/{member}', [ReportController::class, 'memberProfile']);
        Route::get('members/{member}/attendance', [ReportController::class, 'attendanceByMember']);
        Route::get('activities', [ReportController::class, 'activities']);
        Route::get('activities/{activity}', [ReportController::class, 'activityDetail']);
        Route::get('cards', [ReportController::class, 'cards']);
        Route::get('attendance', [ReportController::class, 'attendance']);
        Route::get('users', [ReportController::class, 'users']);
        Route::get('roles', [ReportController::class, 'roles']);
    });

    Route::prefix('map')->middleware('permission:map.view')->group(function () {
        Route::get('statistics', [MapController::class, 'statistics']);
        Route::get('config', [MapController::class, 'config']);
    });

    // ------------------------------------------------------------ Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('categories', [NotificationController::class, 'categories']);
        Route::get('since', [NotificationController::class, 'since']);
        Route::get('stats', [NotificationController::class, 'stats']);
        Route::get('unread-count', [NotificationController::class, 'unreadCount']);
        Route::get('/', [NotificationController::class, 'index']);
        Route::post('/', [NotificationController::class, 'store']);
        Route::post('read-all', [NotificationController::class, 'markAllAsRead']);
        Route::post('device-token', [NotificationController::class, 'registerDevice']);
        Route::post('{notification}/read', [NotificationController::class, 'markAsRead']);
        Route::delete('{notification}', [NotificationController::class, 'destroy']);
    });

    Route::prefix('notification-preferences')->group(function () {
        Route::get('/', [NotificationPreferenceController::class, 'show']);
        Route::put('/', [NotificationPreferenceController::class, 'update']);
    });

    Route::prefix('user-preferences')->group(function () {
        Route::get('/', [UserPreferenceController::class, 'show']);
        Route::put('/', [UserPreferenceController::class, 'update']);
    });

    // ------------------------------------------------------------ Administration
    Route::middleware('permission:users.view,roles.manage')->get('roles', [UserController::class, 'roles']);
    Route::middleware('permission:users.view,roles.manage')->get('permissions', [RoleController::class, 'catalog']);
    Route::middleware('permission:roles.manage')->group(function () {
        Route::put('roles/{role}/permissions', [RoleController::class, 'updatePermissions']);
        Route::delete('roles/{role}/permissions/{permission}', [RoleController::class, 'detachPermission'])
            ->where('permission', '[A-Za-z0-9._-]+');
    });
    Route::middleware('permission:settings.manage')->group(function () {
        Route::get('settings', [SettingsController::class, 'show']);
        Route::match(['put', 'post', 'patch'], 'settings', [SettingsController::class, 'update']);
    });

    /** Posts page d'accueil — réservé super-admin (contrôle dans le contrôleur). */
    Route::prefix('home-posts')->group(function () {
        Route::get('/', [HomePostController::class, 'index']);
        Route::post('/', [HomePostController::class, 'store']);
        Route::get('{homePost}', [HomePostController::class, 'show']);
        Route::match(['put', 'post', 'patch'], '{homePost}', [HomePostController::class, 'update']);
        Route::delete('{homePost}', [HomePostController::class, 'destroy']);
        Route::get('{homePost}/image', [HomePostController::class, 'adminImage']);
    });

    Route::apiResource('users', UserController::class);

    Route::prefix('audit')->middleware('permission:audit.view')->group(function () {
        Route::get('/', [AuditLogController::class, 'index']);
        Route::get('stats', [AuditLogController::class, 'stats']);
        Route::get('verifications', [AuditLogController::class, 'verifications']);
    });

    // ------------------------------------------------------------ Médias protégés
    Route::get('media/members/{member}/photo', [MediaController::class, 'memberPhoto'])
        ->name('media.member-photo');
    Route::get('media/users/{user}/photo', [MediaController::class, 'userPhoto'])
        ->name('media.user-photo');
    Route::get('media/chats/{attachment}', [MediaController::class, 'chatAttachment'])
        ->name('media.chat-attachment');
    Route::get('media/activities/{activity}/image', [MediaController::class, 'activityImage'])
        ->name('media.activity-image');
    Route::get('media/news/{newsPost}/file', [MediaController::class, 'newsFile'])
        ->name('media.news-file');
    Route::get('media/news/{newsPost}/gallery/{index}', [MediaController::class, 'newsGallery'])
        ->name('media.news-gallery');
});
