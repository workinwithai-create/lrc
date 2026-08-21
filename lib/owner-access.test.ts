import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  hasUnlimitedAccess,
  isOwnerEmail,
  remainingCredits,
} from './owner-access.ts';

describe('isOwnerEmail', () => {
  it('matches the three owner emails case-insensitively', () => {
    assert.equal(isOwnerEmail('markparsonsjrmusic@gmail.com'), true);
    assert.equal(isOwnerEmail('MPJRecords90@gmail.com'), true);
    assert.equal(isOwnerEmail('  WorkinWithAI@gmail.com  '), true);
  });

  it('rejects other emails and empty values', () => {
    assert.equal(isOwnerEmail('someone@example.com'), false);
    assert.equal(isOwnerEmail('markparsonsjrmusic@gmail.com.evil'), false);
    assert.equal(isOwnerEmail(''), false);
    assert.equal(isOwnerEmail(null), false);
    assert.equal(isOwnerEmail(undefined), false);
  });
});

describe('hasUnlimitedAccess', () => {
  it('treats profile.is_admin as unlimited even without an owner email', () => {
    assert.equal(hasUnlimitedAccess({ is_admin: true, email: 'user@example.com' }), true);
  });

  it('treats a matching signed-in email as unlimited when is_admin is false', () => {
    assert.equal(
      hasUnlimitedAccess(
        { is_admin: false, email: 'other@example.com', credits: 0 },
        'markparsonsjrmusic@gmail.com'
      ),
      true
    );
  });

  it('treats a matching profile email as unlimited', () => {
    assert.equal(
      hasUnlimitedAccess({ is_admin: false, email: 'mpjrecords90@gmail.com', credits: 0 }),
      true
    );
  });

  it('does not grant access to a regular unpaid user', () => {
    assert.equal(
      hasUnlimitedAccess({ is_admin: false, email: 'fan@example.com', credits: 0 }),
      false
    );
  });
});

describe('remainingCredits', () => {
  it('returns null (unlimited) for owner emails and admins', () => {
    assert.equal(
      remainingCredits({ is_admin: false, credits: 0 }, 'workinwithai@gmail.com'),
      null
    );
    assert.equal(remainingCredits({ is_admin: true, credits: 0 }), null);
  });

  it('sums active subscription quota and bonus credits for regular users', () => {
    assert.equal(
      remainingCredits({
        is_admin: false,
        subscription_status: 'active',
        monthly_quota_remaining: 4,
        credits: 2,
      }),
      6
    );
  });

  it('ignores quota when the subscription is not active', () => {
    assert.equal(
      remainingCredits({
        is_admin: false,
        subscription_status: 'canceled',
        monthly_quota_remaining: 4,
        credits: 1,
      }),
      1
    );
  });
});
