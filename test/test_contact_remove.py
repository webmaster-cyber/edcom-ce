import test_base

class TestContactRemove(test_base.TestBase):

    def test_contact_remove(self):
        result = self.user_post('/api/lists', json={
            "name": "test_contact_remove"
        })

        lid = result['id']

        emails = ['frank@petpsychic.com', 'george@petpsychic.com', 'nonexistent@email']
        otheremails = ['unsub1@petpsychic.com', 'unsub2@petpsychic.com']

        self.user_post(f'/api/lists/{lid}/feed', json={
            'email': emails[0],
            'tags': ['buyer', 'shopper'],
            'data': {
                'First Name': 'Frank',
                'Last Name': 'Test'
            }
        })
        self.user_post(f'/api/lists/{lid}/feed', json={
            'email': emails[1],
            'tags': ['tester'],
            'data': {
                'First Name': 'George',
                'Last Name': 'Test'
            }
        })
        for otheremail in otheremails:
            self.user_post(f'/api/lists/{lid}/feed', json={
                'email': otheremail,
                'unsubscribe': True,
            })

        lst = self.db.lists.get(lid)
        assert lst['count'] == 4
        assert lst['domaincount'] == 1
        assert lst['unsubscribed'] == 2

        result = self.user_post(f'/api/lists/{lid}/deletecontacts', json=emails)

        assert result['count'] == 2
        assert self.db.single("""select count(*) from list_domains where list_id = %s""", lid) == 1
        lst = self.db.lists.get(lid)
        assert lst['count'] == 2
        assert lst['domaincount'] == 1
        assert lst['unsubscribed'] == 2

        result = self.user_post(f'/api/lists/{lid}/deletecontacts', json=otheremails)

        assert result['count'] == 2
        assert self.db.single("""select count(*) from list_domains where list_id = %s""", lid) == 0
        lst = self.db.lists.get(lid)
        assert lst['count'] == 0
        assert lst['domaincount'] == 0
        assert lst['unsubscribed'] == 0

        result = self.user_post(f'/api/lists/{lid}/find', json={
            'operator': 'and',
            'parts': [{
                "type": "Info",
                "prop": "",
                "operator": "contains",
                "value": "",
            }],
            'sort': {
                'id': 'Email',
                'desc': False,
            }
        })

        assert result.get('complete')
        assert len(result['result']['rows']) == 0