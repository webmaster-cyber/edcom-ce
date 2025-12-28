import csv
import test_base
from io import StringIO

class TestSuppListAdd(test_base.TestBase):

    def test_add(self):
        result = self.user_post('/api/supplists', json={
            "name": "test_add"
        })

        lid = result['id']

        with open("/test/thousand.csv") as fp:
            body = StringIO()
            writer = csv.writer(body)
            for row in csv.reader(fp):
                writer.writerow([row[0]])
            self.user_post(f'/api/supplists/{lid}/add', body=body.getvalue())

        lst = self.db.supplists.get(lid)

        assert lst['count'] == 1000

        assert self.db.single("""select count(*) from contacts.contact_supplists where supplist_id = %s""", lid) == 1000

        self.user_delete(f'/api/supplists/{lid}')

        assert self.db.single("""select count(*) from contacts.contact_supplists where supplist_id = %s""", lid) == 0