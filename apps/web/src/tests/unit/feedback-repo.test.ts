import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeedbackReportInput } from '@safebite/domain';
import { clearAllLocalData, pendingFeedbackRepo } from '../../lib/local-repo';
import { FeedbackSubmitError, submitFeedback } from '../../features/feedback/feedback-client';
import { flushPendingFeedback, submitOrQueueFeedback } from '../../features/feedback/offline-feedback-queue';

// Mock only the network call; keep the real FeedbackSubmitError (isNonQueueable uses instanceof).
vi.mock('../../features/feedback/feedback-client', async (importActual) => {
  const actual = await importActual<typeof import('../../features/feedback/feedback-client')>();
  return { ...actual, submitFeedback: vi.fn() };
});
const submitMock = vi.mocked(submitFeedback);

function payload(over: Partial<FeedbackReportInput> = {}): FeedbackReportInput {
  return {
    clientReportId: 'web-uuid-1',
    restaurantId: 'rest_1',
    city: 'hanoi',
    clientPlatform: 'pwa_web',
    submissionSource: 'online',
    allergenIds: ['peanut'],
    reaction: 'none',
    ...over,
  } as FeedbackReportInput;
}

const okResponse = {
  reportId: 'fb_1',
  clientReportId: 'web-uuid-1',
  status: 'needs_review' as const,
  priority: 'low' as const,
  severeAutoFlagged: false,
  createdAt: '2026-07-09T00:00:00.000Z',
};

beforeEach(async () => {
  await clearAllLocalData();
  submitMock.mockReset();
});

describe('pendingFeedbackRepo (offline outbox)', () => {
  it('save → list roundtrip; clearAllLocalData empties the table', async () => {
    await pendingFeedbackRepo.save(payload());
    expect(await pendingFeedbackRepo.count()).toBe(1);
    const rows = await pendingFeedbackRepo.list();
    expect(rows[0]?.status).toBe('pending');
    await clearAllLocalData();
    expect(await pendingFeedbackRepo.count()).toBe(0);
  });

  it('stores ONLY the sync payload — no geolocation keys (privacy shape)', async () => {
    await pendingFeedbackRepo.save(payload());
    const row = (await pendingFeedbackRepo.list())[0]!;
    const json = JSON.stringify(row);
    // Match quoted JSON keys so "clientPlatform" (which contains "lat") is not a false positive.
    for (const k of ['lat', 'lon', 'latitude', 'longitude', 'distanceMeters', 'accuracyMeters', 'geolocation']) {
      expect(json).not.toContain(`"${k}"`);
    }
  });
});

describe('submitOrQueueFeedback (behavior matrix)', () => {
  it('offline → queues, never calls the network', async () => {
    const outcome = await submitOrQueueFeedback(payload(), { online: false });
    expect(outcome).toBe('queued');
    expect(submitMock).not.toHaveBeenCalled();
    expect(await pendingFeedbackRepo.count()).toBe(1);
  });

  it('online success → submitted, no queue row', async () => {
    submitMock.mockResolvedValue(okResponse);
    const outcome = await submitOrQueueFeedback(payload(), { online: true });
    expect(outcome).toBe('submitted');
    expect(await pendingFeedbackRepo.count()).toBe(0);
  });

  it('online network error → queues', async () => {
    submitMock.mockRejectedValue(new Error('network down'));
    const outcome = await submitOrQueueFeedback(payload(), { online: true });
    expect(outcome).toBe('queued');
    expect(await pendingFeedbackRepo.count()).toBe(1);
  });

  it('online validation error (400) → rethrows and does NOT queue', async () => {
    submitMock.mockRejectedValue(new FeedbackSubmitError(400, 'validation'));
    await expect(submitOrQueueFeedback(payload(), { online: true })).rejects.toBeInstanceOf(FeedbackSubmitError);
    expect(await pendingFeedbackRepo.count()).toBe(0);
  });
});

describe('flushPendingFeedback (drain)', () => {
  it('re-POSTs with offline_synced + offlineCreatedAt and deletes on success', async () => {
    await pendingFeedbackRepo.save(payload());
    const queued = (await pendingFeedbackRepo.list())[0]!;
    submitMock.mockResolvedValue(okResponse);

    const res = await flushPendingFeedback();
    expect(res).toEqual({ synced: 1, failed: 0 });
    expect(await pendingFeedbackRepo.count()).toBe(0);
    const sent = submitMock.mock.calls[0]![0];
    expect(sent.submissionSource).toBe('offline_synced');
    expect(sent.offlineCreatedAt).toBe(queued.createdAt);
  });

  it('keeps the row and marks it failed on a sync error', async () => {
    await pendingFeedbackRepo.save(payload());
    submitMock.mockRejectedValue(new Error('still offline'));

    const res = await flushPendingFeedback();
    expect(res).toEqual({ synced: 0, failed: 1 });
    const row = (await pendingFeedbackRepo.list())[0]!;
    expect(row.status).toBe('failed');
    expect(row.retryCount).toBe(1);
    expect(row.lastError).toContain('still offline');
  });
});
