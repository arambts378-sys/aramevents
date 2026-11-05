import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  hasErrors,
  validatePackageForm,
  validatePaymentAmount,
  validatePersonForm,
  validatePublicRegistration,
  validateRegistrationSettings,
  validateSponsorForm,
  validateSponsorRequest,
  validateTicketForm,
  validateZoneForm,
  withoutFieldError,
} from '../forms';

const sponsor = {
  name: 'Acme',
  tier: '',
  amount_agreed: '50000',
  amount_received: '0',
  due_date: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  website_url: '',
  notes: '',
};

const ticket = {
  name: 'General',
  description: '',
  ticket_type: 'free',
  price_in_rupees: '0',
  quantity_total: '100',
  sales_start_at: '',
  sales_end_at: '',
  min_per_order: '1',
  max_per_order: '5',
};

const person = { first_name: 'Asha', last_name: '', email: 'asha@example.com', phone: '', organization: '', job_title: '' };

describe('sponsor form', () => {
  it('accepts a name and amount alone', () => {
    assert.equal(hasErrors(validateSponsorForm(sponsor)), false);
  });

  it('flags each field by name', () => {
    const errors = validateSponsorForm({ ...sponsor, name: ' ', amount_agreed: '-5', contact_email: 'nope', website_url: 'javascript:alert(1)' });
    assert.deepEqual(Object.keys(errors).sort(), ['amount_agreed', 'contact_email', 'name', 'website_url']);
  });

  it('does not allow receiving more than was agreed', () => {
    assert.match(validateSponsorForm({ ...sponsor, amount_agreed: '100', amount_received: '101' }).amount_received, /cannot be more/);
  });

  it('rejects more than two decimals', () => {
    assert.ok(validateSponsorForm({ ...sponsor, amount_agreed: '10.123' }).amount_agreed);
  });
});

describe('sponsor packages and requests', () => {
  it('needs a package name and an amount', () => {
    assert.deepEqual(Object.keys(validatePackageForm({ name: '', amount: '', description: '' })).sort(), ['amount', 'name']);
    assert.equal(hasErrors(validatePackageForm({ name: 'Gold', amount: '50000', description: '' })), false);
  });

  const request = {
    package_id: 'p1',
    organization: 'Acme',
    contact_name: 'Asha',
    contact_email: 'asha@example.com',
    contact_phone: '+91 98765 43210',
    website_url: '',
    message: '',
  };

  it('accepts a complete request', () => {
    assert.equal(hasErrors(validateSponsorRequest(request)), false);
  });

  it('flags a missing package, contact details and unsafe links', () => {
    const errors = validateSponsorRequest({ ...request, package_id: '', contact_phone: '', website_url: 'javascript:alert(1)' });
    assert.deepEqual(Object.keys(errors).sort(), ['contact_phone', 'package_id', 'website_url']);
  });
});

describe('payment amount', () => {
  it('must be above zero and within the balance', () => {
    assert.ok(validatePaymentAmount('0', 500).amount);
    assert.ok(validatePaymentAmount('501', 500).amount);
    assert.equal(hasErrors(validatePaymentAmount('500', 500)), false);
  });
});

describe('ticket form', () => {
  it('needs a price only for paid tickets', () => {
    assert.equal(hasErrors(validateTicketForm(ticket)), false);
    assert.ok(validateTicketForm({ ...ticket, ticket_type: 'paid' }).price_in_rupees);
  });

  it('keeps quantity at or above what was sold', () => {
    assert.match(validateTicketForm({ ...ticket, quantity_total: '4' }, 5).quantity_total, /5 already sold/);
  });

  it('catches an order limit or sale period the wrong way round', () => {
    assert.ok(validateTicketForm({ ...ticket, min_per_order: '6' }).max_per_order);
    const dates = { sales_start_at: '2026-12-02T10:00', sales_end_at: '2026-12-01T10:00' };
    assert.ok(validateTicketForm({ ...ticket, ...dates }).sales_end_at);
  });
});

describe('people and zones', () => {
  it('requires a first name and a valid email', () => {
    assert.equal(hasErrors(validatePersonForm(person)), false);
    assert.deepEqual(Object.keys(validatePersonForm({ ...person, first_name: '', email: 'x' })).sort(), ['email', 'first_name']);
  });

  it('checks a phone only when one is given', () => {
    assert.ok(validatePersonForm({ ...person, phone: 'abc' }).phone);
  });

  it('only checks food limits on food zones', () => {
    const zone = { name: 'Gate', zone_type: 'Gate', description: '', location: '', entitlement_limit: 'x', entitlement_unit: '', distance_km: '', sequence: '' };
    assert.equal(hasErrors(validateZoneForm(zone)), false);
    assert.ok(validateZoneForm({ ...zone, zone_type: 'Food Court' }).entitlement_limit);
  });
});

describe('registration', () => {
  it('allows an empty capacity but not a bad one', () => {
    const settings = { title: '', description: '', capacity: '', confirmation_message: '' };
    assert.equal(hasErrors(validateRegistrationSettings(settings)), false);
    assert.ok(validateRegistrationSettings({ ...settings, capacity: '0' }).capacity);
  });

  it('requires walkathon details only for walkathons', () => {
    const form = {
      first_name: 'Asha', last_name: 'R', email: 'asha@example.com', phone: '+91 98765 43210', organization: '', job_title: '',
      distance_category_id: '', gender: '', age: '', t_shirt_size: '', emergency_contact_name: '', emergency_contact_phone: '',
    };
    assert.equal(hasErrors(validatePublicRegistration(form, false)), false);
    assert.equal(Object.keys(validatePublicRegistration(form, true)).length, 6);
  });
});

describe('clearing an error', () => {
  it('removes only that field', () => {
    assert.deepEqual(withoutFieldError({ name: 'x', email: 'y' }, 'name'), { email: 'y' });
  });
});
