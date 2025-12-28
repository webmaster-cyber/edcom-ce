export const eventTypes = {
  form_submit: 'Submit Form',
  list_add: 'Add to List',
  tag_add: 'Add Tag',
  tag_remove: 'Remove Tag',
  send: 'Receive Message',
  unsub: 'Unsubscribe',
  complaint: 'Complaint',
  hard_bounce: 'Hard Bounce',
  soft_bounce: 'Soft Bounce',
  click: 'Click',
  open: 'Open',
  bounce: 'Soft or Hard Bounce',
  open_click: 'Open or Click',
  unsub_complaint: 'Unsubscribe or Complaint',
};

const dt = new Date().toISOString();

export const eventHelp = {
  form_submit: 'This webhook will be triggered when a contact submits a form.',
  list_add: 'This webhook will be triggered when a contact is added to a list.',
  tag_add: 'This webhook will be triggered when a tag is added to a contact.',
  tag_remove: 'This webhook will be triggered when a tag is removed from a contact.',
  send: 'This webhook will be triggered when a contact receives a message.',
  unsub: 'This webhook will be triggered when a contact unsubscribes.',
  complaint: 'This webhook will be triggered when a contact marks an email as spam.',
  hard_bounce: 'This webhook will be triggered when a contact hard bounces.',
  soft_bounce: 'This webhook will be triggered when a contact soft bounces.',
  click: 'This webhook will be triggered when a contact clicks an email.',
  open: 'This webhook will be triggered when a contact opens an email.',
  bounce: 'This webhook will be triggered when a contact soft or hard bounces.',
  open_click: 'This webhook will be triggered when a contact opens or clicks an email.',
  unsub_complaint: 'This webhook will be triggered when a contact unsubscribes or marks an email as spam.',
};

const click_example = {
  type: "click",
  source: {
    broadcast: "abcdefghijklmnopqrstuv",
    funnelmsg: "vutsrqponmlkjihgfedcba",
    tag: "exampletag",
  },
  linkindex: 0,
  email: "contact@test.domain",
  timestamp: dt,
  agent: "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:64.0) Gecko/20100101 Firefox/64.0",
  ip: "10.10.10.10",
  device: "PC",
  os: "Windows",
  browser: "Firefox",
  country: "United States",
  country_code: "US",
  region: "Maine",
  zip: "04004"
};

const unsub_example = {
  type: "unsub",
  source: {
    broadcast: "abcdefghijklmnopqrstuv",
    funnelmsg: "vutsrqponmlkjihgfedcba",
    tag: "exampletag",
  },
  email: "contact@test.domain",
  timestamp: dt,
};

const soft_bounce_example = {
  type: "bounce",
  source: {
    broadcast: "abcdefghijklmnopqrstuv",
    funnelmsg: "vutsrqponmlkjihgfedcba",
    tag: "exampletag",
  },
  email: "contact@test.domain",
  timestamp: dt,
  bouncetype: "soft",
  code: "552 User over quota"
}

export const eventExamples = {
  form_submit: {
    type: "form_submit",
    form: "abcdefghijklmnopqrstuv",
    email: "contact@test.domain",
    data: {
      "Custom Field": "Custom Value",
    },
    timestamp: dt,
  },
  list_add: {
    type: "list_add",
    list: "abcdefghijklmnopqrstuv",
    email: "contact@test.domain",
    timestamp: dt,
  },
  tag_add: {
    type: "tag_add",
    tag: "exampletag",
    email: "contact@test.domain",
    timestamp: dt,
  },
  tag_remove: {
    type: "tag_remove",
    tag: "exampletag",
    email: "contact@test.domain",
    timestamp: dt,
  },
  send: {
    type: "send",
    source: {
      broadcast: "abcdefghijklmnopqrstuv",
      funnelmsg: "vutsrqponmlkjihgfedcba",
      tag: "exampletag",
    },
    email: "contact@test.domain",
    timestamp: dt,
  },
  unsub: unsub_example,
  complaint: {
    type: "complaint",
    source: {
      broadcast: "abcdefghijklmnopqrstuv",
      funnelmsg: "vutsrqponmlkjihgfedcba",
      tag: "exampletag",
    },
    email: "contact@test.domain",
    timestamp: dt,
  },
  hard_bounce: {
    type: "bounce",
    source: {
      broadcast: "abcdefghijklmnopqrstuv",
      funnelmsg: "vutsrqponmlkjihgfedcba",
      tag: "exampletag",
    },
    email: "contact@test.domain",
    timestamp: dt,
    bouncetype: "hard",
    code: "550 No such user"
  },
  soft_bounce: soft_bounce_example,
  click: click_example,
  open: {
    type: "open",
    source: {
      broadcast: "abcdefghijklmnopqrstuv",
      funnelmsg: "vutsrqponmlkjihgfedcba",
      tag: "exampletag",
    },
    email: "contact@test.domain",
    timestamp: dt,
    agent: "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:64.0) Gecko/20100101 Firefox/64.0",
    ip: "10.10.10.10",
    device: "PC",
    os: "Windows",
    browser: "Firefox",
    country: "United States",
    country_code: "US",
    region: "Maine",
    zip: "04004"
  },
  bounce: soft_bounce_example,
  open_click: click_example,
  unsub_complaint: unsub_example,
};

export const hasProps = {
  form_submit: true,
};
