import test_base

class TestExclusions(test_base.TestBase):

    def test_exclusions(self):
        result = self.user_post('/api/lists', json={
            "name": "test_exclusions"
        })

        lid = result['id']

        with open("/test/thousand.csv") as fp:
            self.user_post(f'/api/lists/{lid}/add', body=fp.read())

        lst = self.db.lists.get(lid)
        assert lst['count'] == 1000
        assert lst['domaincount'] == 4

        assert self.db.single("select count from list_domains where list_id = %s and domain = %s", lid, 'hotmail.com') == 194
        assert self.db.single("select count from list_domains where list_id = %s and domain = %s", lid, 'gmail.com') == 408

        result = self.user_post('/api/exclusion/d/add', json={
            'data': ['yahoo.com']
        })

        lst = self.db.lists.get(lid)

        assert lst['count'] == 1000 - 193
        assert lst['domaincount'] == 3

        assert self.db.single("select count from list_domains where list_id = %s and domain = %s", lid, 'yahoo.com') is None

        result = self.user_post('/api/exclusion/e/add', json={
            'data': ['esme.pfister@hotmail.com', 'dre.bugbee@gmail.com']
        })

        lst = self.db.lists.get(lid)

        assert lst['count'] == 1000 - 195
        assert self.db.single("select count from list_domains where list_id = %s and domain = %s", lid, 'hotmail.com') == 193
        assert self.db.single("select count from list_domains where list_id = %s and domain = %s", lid, 'gmail.com') == 407

        self.user_post(f'/api/lists/{lid}/feed', json={
            'email': 'dre.bugbee@gmail.com',
            'data': {
                'First Name': 'Drew',
                'Last Name': 'Bugbee'
            }
        })

        lst = self.db.lists.get(lid)

        assert lst['count'] == 1000 - 195

        self.user_post(f'/api/lists/{lid}/add', body='''Email
test1@yahoo.com
test2@yahoo.com
''')
                       
        lst = self.db.lists.get(lid)

        assert lst['count'] == 1000 - 195
        assert lst['domaincount'] == 3

        self.user_delete(f'/api/lists/{lid}')

        self.db.execute("delete from exclusions")