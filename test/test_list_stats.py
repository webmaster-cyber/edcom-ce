import test_base

class TestListStats(test_base.TestBase):

    def test_stats(self):
        result = self.user_post('/api/lists', json={
            "name": "test_stats"
        })

        lid = result['id']
        cid = result['cid']

        self.db.execute("insert into unsublogs (cid, email, rawhash, unsubscribed, complained, bounced) values (%s, %s, %s, true, true, true)",
                        cid, "ericha.marve@hotmail.com", 999999999)

        with open("/test/thousand.csv") as fp:
            self.user_post(f'/api/lists/{lid}/add', body=fp.read())

        lst = self.db.lists.get(lid)

        assert lst['bounced'] == 1
        assert lst['unsubscribed'] == 1
        assert lst['complained'] == 1

        result = self.user_post(f'/api/lists/{lid}/find', json={
            'operator': 'and',
            'parts': [{
                "type": "Info",
                "prop": "Email",
                "operator": "equals",
                "value": "ericha.marve@hotmail.com",
            }],
            'sort': {
                'id': 'Email',
                'desc': False,
            }
        })

        assert result.get('complete')
        assert result['result']['rows'][0] == {
            'Email': 'ericha.marve@hotmail.com',
            'First Name': 'Ericha',
            'Last Name': 'Marve',
            'Unsubscribed': 'true',
            'Complained': 'true',
            'Bounced': 'true',
        }

        self.user_post(f'/api/lists/{lid}/addunsubs', body='''esme.pfister@hotmail.com
dre.bugbee@gmail.com
gianina.karly@hotmail.com
lizzie.shiller@gmail.com
''')
        lst = self.db.lists.get(lid)
        assert lst['bounced'] == 1
        assert lst['unsubscribed'] == 5
        assert lst['complained'] == 1

        with open("/test/thousand.csv") as fp:
            key = self.user_post(f'/api/uploadfile', body=fp.read())['key']

        self.user_post(f'/api/lists/{lid}/import', json={
            'key': key,
            'colmap': ['Email','First Name','Last Name'],
            'override': True,
        })

        lst = self.db.lists.get(lid)

        assert lst['bounced'] == 0
        assert lst['unsubscribed'] == 0
        assert lst['complained'] == 0
