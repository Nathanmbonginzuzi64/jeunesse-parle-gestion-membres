<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JpMessage;
use App\Services\AuditLogger;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactController extends Controller
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly AuditLogger $audit,
    ) {}

    /** Formulaire public Contact → boîte JP Message (SuperAdmin / admins). */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190'],
            'message' => ['required', 'string', 'max:5000'],
            'subject' => ['nullable', 'string', 'max:200'],
        ]);

        $subject = trim((string) ($validated['subject'] ?? ''));
        if ($subject === '') {
            $subject = 'Contact site web — '.$validated['name'];
        }

        $message = JpMessage::create([
            'reference' => 'JP-MSG-'.str_pad((string) (JpMessage::withTrashed()->count() + 1), 6, '0', STR_PAD_LEFT),
            'member_id' => null,
            'guest_name' => $validated['name'],
            'guest_email' => $validated['email'],
            'source' => 'contact',
            'subject' => $subject,
            'category' => 'demande',
            'body' => $validated['message'],
            'status' => 'open',
        ]);

        $this->audit->log(
            'jp_message.contact_created',
            $message,
            "Contact site {$message->reference} — {$validated['email']}"
        );

        $this->notifications->jpMessageCreatedForAdmins($message);

        return response()->json([
            'message' => 'Votre message a bien été envoyé. L’équipe Jeunesse Parle vous répondra rapidement.',
            'data' => [
                'reference' => $message->reference,
            ],
        ], 201);
    }
}
