import test_base
from datetime import datetime, timedelta
from api.shared.contacts import update
from api.shared.utils import get_os, get_browser, get_device, unix_time_secs
from api.lists import refresh_active_counts

class TestRefreshActive(test_base.TestBase):

    def test_update(self):
        result = self.user_post('/api/lists', json={
            "name": "test_update"
        })

        lid = result['id']

        email = 'dave@petpsychic.com'

        self.user_post(f'/api/lists/{lid}/feed', json={
            'email': email,
            'data': {
                'First Name': 'Dave',
                'Last Name': 'Test'
            }
        })

        camp = self.create_broadcast(lid, 'test_update 1')

        cid = camp['cid']

        self.update(email, 'open', camp['id'], 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:101.0) Gecko/20100101 Firefox/101.0')

        lst = self.db.lists.get(lid)

        assert lst['count'] == 1
        assert lst['active30'] == 1
        assert lst['active60'] == 1
        assert lst['active90'] == 1

        self.db.execute(f"""update contacts."contact_open_logs_{cid}" set ts = %s where contact_id = (
            select contact_id from contacts."contacts_{cid}" where email = %s
        )""", unix_time_secs(datetime.now() - timedelta(days=45)), email)

        refresh_active_counts()

        lst = self.db.lists.get(lid)

        assert lst['count'] == 1
        assert lst['active30'] == 0
        assert lst['active60'] == 1
        assert lst['active90'] == 1

    def create_broadcast(self, lid, name):
        return self.user_post('/api/broadcasts', json={
            'name': name,
            'when': 'draft',
            'tags': [],
            'lists': [lid],
            'segments': [],
            'supplists': [],
            'suppsegs': [],
            'supptags': [],
            'subject': 'test',
            'fromname': 'test',
            'fromemail': '',
            'returnpath': 'test',
            'replyto': '',
            'rawText': '',
            'type': 'raw',
            'parts': [],
            'bodyStyle': {}
        })

    def update(self, email, ct, c, agent=None, linkindex=None):
        upd = {
            'email': email,
            'cmd': ct,
            'campid': c,
        }
        if ct == 'click' and linkindex >= 0:
            upd['updatedts'] = None
            upd['linkindex'] = linkindex

        if agent:
            agentl = agent.lower()
            upd['os'] = get_os(agentl)
            upd['browser'] = get_browser(agentl)
            upd['device'] = get_device(agentl)
            upd['country'] = 'United States of America'
            upd['region'] = 'California'
            upd['zip'] = '99999'

        update(self.db, self.user_cookie['cid'], upd)