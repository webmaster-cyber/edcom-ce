import test_base

class TestListDeleteDomains(test_base.TestBase):

    def test_deletedomains(self):
        result = self.user_post('/api/lists', json={
            "name": "test_deletedomains"
        })

        lid = result['id']

        with open("/test/thousand.csv") as fp:
            self.user_post(f'/api/lists/{lid}/add', body=fp.read())

        lst = self.db.lists.get(lid)
        assert lst['count'] == 1000
        assert lst['domaincount'] == 4

        assert self.db.single("select count from list_domains where list_id = %s and domain = %s", lid, 'hotmail.com') == 194
        assert self.db.single("select count from list_domains where list_id = %s and domain = %s", lid, 'gmail.com') == 408

        result = self.user_post(f'/api/lists/{lid}/deletedomains', json=['hotmail.com', 'gmail.com'])

        lst = self.db.lists.get(lid)

        assert lst['count'] == 1000 - 194 - 408
        assert lst['domaincount'] == 2

        assert self.db.single("select count from list_domains where list_id = %s and domain = %s", lid, 'hotmail.com') is None
        assert self.db.single("select count from list_domains where list_id = %s and domain = %s", lid, 'gmail.com') is None

        self.user_delete(f'/api/lists/{lid}')
