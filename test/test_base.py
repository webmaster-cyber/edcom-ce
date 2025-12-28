import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from falcon import testing
from api.app import application
from api.shared.db import DB

os.environ['SYNC_TASKS'] = '1'

class TestBase(testing.TestCase):

    def setUp(self):
        super(TestBase, self).setUp()

        self.app = application

        self.db = DB()

        self.admin_cookie = self.db.cookies.find_one({'admin': True})
        self.user_cookie = self.db.cookies.find_one({'admin': False})

    def user_post(self, path, **kwargs):
        result = self.simulate_post(path, headers={
            'X-Auth-UID': self.user_cookie['uid'],
            'X-Auth-Cookie': self.user_cookie['id']
        }, **kwargs)

        if result.status_code < 200 or result.status_code >= 300:
            print(result.status)
            print(result.text)
            assert False, "API request failed"

        return result.json
    
    def user_patch(self, path, **kwargs):
        result = self.simulate_patch(path, headers={
            'X-Auth-UID': self.user_cookie['uid'],
            'X-Auth-Cookie': self.user_cookie['id']
        }, **kwargs)

        if result.status_code < 200 or result.status_code >= 300:
            print(result.status)
            print(result.text)
            assert False, "API request failed"

        return result.json

    def user_delete(self, path):
        result = self.simulate_delete(path, headers={
            'X-Auth-UID': self.user_cookie['uid'],
            'X-Auth-Cookie': self.user_cookie['id']
        })

        if result.status_code < 200 or result.status_code >= 300:
            print(result.status)
            print(result.text)
            assert False, "API request failed"

    def user_get(self, path):
        result = self.simulate_get(path, headers={
            'X-Auth-UID': self.user_cookie['uid'],
            'X-Auth-Cookie': self.user_cookie['id']
        })

        if result.status_code < 200 or result.status_code >= 300:
            print(result.status)
            print(result.text)
            assert False, "API request failed"

        return result.json