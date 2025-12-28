import test_base

class TestTagRemove(test_base.TestBase):

    def test_tag_remove(self):
        tag = 'removeme'

        result = self.user_post('/api/lists', json={
            "name": "test_tag_remove"
        })

        lid = result['id']

        lst = self.db.lists.get(lid)
        cid = lst['cid']

        with open("/test/thousand.csv") as fp:
            self.user_post(f'/api/lists/{lid}/add', body=fp.read())

        self.user_post(f'/api/lists/{lid}/feed', json={
            'email': 'esme.pfister@hotmail.com',
            'tags': [tag],
        })
        self.user_post(f'/api/lists/{lid}/feed', json={
            'email': 'dre.bugbee@gmail.com',
            'tags': [tag],
        })
        self.user_post(f'/api/lists/{lid}/feed', json={
            'email': 'gianina.karly@hotmail.com',
            'tags': [tag],
        })

        assert self.db.single("select count from alltags where cid = %s and tag = %s", cid, tag) == 3

        self.user_delete(f'/api/alltags/{tag}')

        assert self.db.single("select count from alltags where cid = %s and tag = %s", cid, tag) == None

        result = self.user_post(f'/api/lists/{lid}/find', json={
            'operator': 'and',
            'parts': [{
                "type": "Info",
                "test": "tag",
                "tag": "removeme"
            }],
            'sort': {
                'id': 'Email',
                'desc': False,
            }
        })

        assert len(result['result']['rows']) == 0

        self.user_delete(f'/api/lists/{lid}')