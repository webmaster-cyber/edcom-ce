import test_base

class TestFormPost(test_base.TestBase):

    def test_post(self):
        result = self.user_post('/api/funnels', json={
            "name": "Form Test",
            "type": "responders",
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
                }
            ]
        })
        result = self.user_post('/api/forms', json={
            'name': 'Test Form',
            'funnel': fid,
            'list': None,
            'submitaction': 'msg',
            'submitmsg': 'test',
        })

        formid = result['id']
        lid = result['list']

        result = self.user_post(f'/api/postform/{formid}.json', body="Name=test+name&Email=hello%2Btest%40petpsychic.com")
        assert result == {
            'action': 'msg',
            'data': 'test',
        }

        lst = self.db.lists.get(lid)
        frm = self.db.forms.get(formid)
        funnel = self.db.funnels.get(fid)
        assert lst['count'] == 1
        assert lst['used_properties'] == ['Email', 'Name']
        assert frm['submits'] == 1
        assert frm['submits_uniq'] == 1
        assert funnel['count'] == 1