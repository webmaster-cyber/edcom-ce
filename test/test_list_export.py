import zipfile
import test_base

class TestListExport(test_base.TestBase):

    def test_export(self):
        result = self.user_post('/api/lists', json={
            "name": "test_export"
        })

        lid = result['id']

        with open("/test/thousand.csv") as fp:
            self.user_post(f'/api/lists/{lid}/add', body=fp.read())

        result = self.user_post(f'/api/lists/{lid}/export')

        exportid = result['id']

        export = self.db.exports.get(exportid)

        assert export['complete'] == True
        assert export['count'] == 1000
        
        comps = export['url'].split('/')

        path = "/".join(comps[-3:])

        zip = zipfile.ZipFile(f"/buckets/transfer/{path}")
        count = 0
        with zip.open('active.csv') as fp:
            for line in fp:
                count += 1
        
        assert count == 1001

        self.user_delete(f'/api/lists/{lid}')
