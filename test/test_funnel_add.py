import test_base
from api.shared.contacts import update, add_send
from api.shared.utils import get_os, get_browser, get_device

class TestFunnelAdd(test_base.TestBase):

    def test_add(self):

        email = 'carl@petpsychic.com'

        result = self.user_post('/api/funnels', json={
            "name": "Test",
            "tags": ["test"],
            "type": "tags",
            "count": 0,
            "active": True,
            "replyto": "",
            "exittags": [],
            "fromname": "Test",
            "messages": [],
            "multiple": False,
            "fromemail": "",
            "returnpath": "test@edcom.ok"
        })
        fid = result['id']

        result = self.user_post('/api/messages', json={
            "who": "all",
            "days": [True, True, True, True, True, True, True],
            "type": "wysiwyg",
            "funnel": fid,
            "subject": "Test Subject",
            "funnelid": fid,
            "suppsegs": [],
            "supptags": [],
            "bodyStyle": {},
            "dayoffset": -240,
            "preheader": "",
            "supplists": [],
            "initialize": False,
            "openaddtags": [],
            "openremtags": [],
            "sendaddtags": [],
            "sendremtags": [],
            "clickaddtags": [],
            "clickremtags": [],
            "rawText": ""
        })
        msgid1 = result['id']
        result = self.user_post('/api/messages', json={
            "who": "all",
            "days": [True, True, True, True, True, True, True],
            "type": "wysiwyg",
            "funnel": fid,
            "subject": "Second Message",
            "funnelid": fid,
            "suppsegs": [],
            "supptags": [],
            "bodyStyle": {},
            "dayoffset": -240,
            "preheader": "",
            "supplists": [],
            "initialize": False,
            "openaddtags": [],
            "openremtags": [],
            "sendaddtags": [],
            "sendremtags": [],
            "clickaddtags": [],
            "clickremtags": [],
            "rawText": ""
        })
        msgid2 = result['id']
        result = self.user_post('/api/messages', json={
            "who": "clicklast",
            "days": [True, True, True, True, True, True, True],
            "type": "wysiwyg",
            "funnel": fid,
            "subject": "Third Message",
            "funnelid": fid,
            "suppsegs": [],
            "supptags": [],
            "bodyStyle": {},
            "dayoffset": -240,
            "preheader": "",
            "supplists": [],
            "initialize": False,
            "openaddtags": [],
            "openremtags": [],
            "sendaddtags": [],
            "sendremtags": [],
            "clickaddtags": [],
            "clickremtags": [],
            "rawText": ""
        })
        msgid3 = result['id']

        self.user_patch(f'/api/funnels/{fid}', json={
            "messages": [
                {
                    "id": msgid1,
                    "replyto": "",
                    "whennum": 0,
                    "fromname": "Test",
                    "whentime": "",
                    "whentype": "mins",
                    "fromemail": "",
                    "returnpath": "test@edcom.ok"
                },
                {
                    "id": msgid2,
                    "replyto": "",
                    "whennum": 1,
                    "fromname": "Test",
                    "msgroute": "",
                    "whentime": "",
                    "whentype": "mins",
                    "fromemail": "",
                    "returnpath": "test@edcom.ok",
                    "unpublished": False
                },
                {
                    "id": msgid3,
                    "replyto": "",
                    "whennum": 1,
                    "fromname": "Test",
                    "msgroute": "",
                    "whentime": "",
                    "whentype": "mins",
                    "fromemail": "",
                    "returnpath": "test@edcom.ok",
                    "unpublished": False
                }
            ]
        })

        result = self.user_post('/api/lists', json={
            "name": "test_add"
        })

        lid = result['id']

        self.user_post(f'/api/lists/{lid}/feed', json={
            'email': email,
            'data': {
                'First Name': 'Carl',
                'Last Name': 'Test'
            }
        })

        result = self.user_post('/api/segments', json={
            'operator': 'and',
            'parts': [{
                "type": "Info",
                "prop": "Email",
                "operator": "contains",
                "value": "carl",
            }],
            'subset': False,
            'subsettype': 'percent',
            'subsetpct': 10,
            'subsetnum': 2000,
        })

        segmentid = result['id']

        # first message sends when contact is tagged
        self.user_post(f'/api/segments/{segmentid}/tag', json={
            'tags': ['test']
        })

        cnt = self.db.single("select count(*) from funnelqueue where email = %s and messageid = %s", email, msgid1)

        assert cnt == 1

        # second message sends when message 1 is received
        add_send(self.db, msgid1, [email])

        cnt = self.db.single("select count(*) from funnelqueue where email = %s and messageid = %s", email, msgid2)

        assert cnt == 1

        # third message sends when contact clicks on message 2
        agent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:101.0) Gecko/20100101 Firefox/101.0'

        upd = {
            'email': email,
            'cmd': 'click',
            'campid': msgid2,
            'updatedts': None,
            'linkindex': 1,
        }
        agentl = agent.lower()
        upd['os'] = get_os(agentl)
        upd['browser'] = get_browser(agentl)
        upd['device'] = get_device(agentl)
        upd['country'] = 'United States of America'
        upd['region'] = 'California'
        upd['zip'] = '99999'

        update(self.db, self.user_cookie['cid'], upd)

        cnt = self.db.single("select count(*) from funnelqueue where email = %s and messageid = %s", email, msgid3)

        assert cnt == 1
