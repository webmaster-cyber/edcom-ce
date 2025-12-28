import test_base

class TestListAdd(test_base.TestBase):

    def test_add(self):
        result = self.user_post('/api/lists', json={
            "name": "test_add"
        })

        lid = result['id']

        with open("/test/thousand.csv") as fp:
            self.user_post(f'/api/lists/{lid}/add', body=fp.read())

        lst = self.db.lists.get(lid)

        assert lst['count'] == 1000
        assert lst['used_properties'] == ['Email', 'First Name', 'Last Name']

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
            'Last Name': 'Marve'
        }

        assert self.db.single("""select count(*) from contacts.contact_lists where list_id = %s""", lid) == 1000

        self.user_delete(f'/api/lists/{lid}')

        assert self.db.single("""select count(*) from contacts.contact_lists where list_id = %s""", lid) == 0