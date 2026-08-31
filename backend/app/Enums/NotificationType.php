<?php

namespace App\Enums;

enum NotificationType: string
{
    case MemberWelcome = 'member_welcome';
    case AccountValidated = 'account_validated';
    case AccountStatusChanged = 'account_status_changed';
    case CardIssued = 'card_issued';
    case CardExpiring = 'card_expiring';
    case ActivityPublished = 'activity_published';
    case ActivityInvitation = 'activity_invitation';
    case ActivityUpdated = 'activity_updated';
    case ActivityReminder = 'activity_reminder';
    case ActivityLiveLocation = 'activity_live_location';
    case AttendanceRecorded = 'attendance_recorded';
    case AttendanceFailed = 'attendance_failed';
    case NewsPublished = 'news_published';
    case NewsComment = 'news_comment';
    case NewsReaction = 'news_reaction';
    case NewsShare = 'news_share';
    case JpMessageCreated = 'jp_message_created';
    case JpMessageReply = 'jp_message_reply';
    case AdminNewMember = 'admin_new_member';
    case AdminNewActivity = 'admin_new_activity';
    case AdminSystemAlert = 'admin_system_alert';
    case Manual = 'manual';

    public function category(): NotificationCategory
    {
        return match ($this) {
            self::MemberWelcome, self::AccountValidated, self::AccountStatusChanged,
            self::CardIssued, self::CardExpiring => NotificationCategory::Member,
            self::ActivityPublished, self::ActivityInvitation, self::ActivityUpdated,
            self::ActivityReminder, self::ActivityLiveLocation => NotificationCategory::Activity,
            self::AttendanceRecorded, self::AttendanceFailed => NotificationCategory::Presence,
            self::NewsPublished, self::NewsComment, self::NewsReaction, self::NewsShare => NotificationCategory::News,
            self::JpMessageCreated, self::JpMessageReply => NotificationCategory::Message,
            self::AdminNewMember, self::AdminNewActivity, self::AdminSystemAlert => NotificationCategory::Admin,
            self::Manual => NotificationCategory::Admin,
        };
    }

    public function defaultLevel(): string
    {
        return match ($this) {
            self::CardExpiring, self::ActivityUpdated, self::AttendanceFailed,
            self::AdminSystemAlert => 'warning',
            self::AccountStatusChanged => 'warning',
            self::AccountValidated, self::CardIssued, self::AttendanceRecorded,
            self::MemberWelcome => 'success',
            default => 'info',
        };
    }

    /** @return list<string> */
    public static function forCategory(NotificationCategory $category): array
    {
        return array_values(array_map(
            fn (self $type) => $type->value,
            array_filter(self::cases(), fn (self $type) => $type->category() === $category),
        ));
    }
}
