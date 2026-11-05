import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { rupeesToPaiseAmount, sponsorBalance, sponsorPaymentStatus, summarizeSponsors, type EventSponsor } from '../sponsors';

const TODAY = '2026-11-05';
const pay = (amount_agreed: number, amount_received: number, due_date: string | null = null) => ({ amount_agreed, amount_received, due_date });

describe('sponsor payments', () => {
  it('works out the payment status', () => {
    assert.equal(sponsorPaymentStatus(pay(0, 0), TODAY), 'not_charged');
    assert.equal(sponsorPaymentStatus(pay(100, 0), TODAY), 'unpaid');
    assert.equal(sponsorPaymentStatus(pay(100, 40), TODAY), 'part_paid');
    assert.equal(sponsorPaymentStatus(pay(100, 100), TODAY), 'paid');
  });

  it('is overdue only after the due date, and never once paid', () => {
    assert.equal(sponsorPaymentStatus(pay(100, 40, '2026-11-05'), TODAY), 'part_paid');
    assert.equal(sponsorPaymentStatus(pay(100, 40, '2026-11-04'), TODAY), 'overdue');
    assert.equal(sponsorPaymentStatus(pay(100, 100, '2026-11-04'), TODAY), 'paid');
  });

  it('adds up what is agreed, received and left to collect', () => {
    const approved = (p: ReturnType<typeof pay>) => ({ ...p, request_status: 'approved' }) as EventSponsor;
    const list = [approved(pay(100, 40)), approved(pay(50, 50))];
    assert.deepEqual(summarizeSponsors(list), { agreed: 150, received: 90, balance: 60 });
    assert.equal(sponsorBalance(pay(100, 40)), 60);
  });

  it('leaves pending and declined requests out of the totals', () => {
    const list = [
      { ...pay(100, 0), request_status: 'pending' },
      { ...pay(200, 0), request_status: 'declined' },
      { ...pay(50, 10), request_status: 'approved' },
    ] as EventSponsor[];
    assert.deepEqual(summarizeSponsors(list), { agreed: 50, received: 10, balance: 40 });
  });

  it('converts rupees to paise without floating point drift', () => {
    assert.equal(rupeesToPaiseAmount('19.99'), 1999);
    assert.equal(rupeesToPaiseAmount('1000.10'), 100010);
    assert.equal(rupeesToPaiseAmount(''), 0);
  });
});
