import zipfile
import json
import test_base

class TestContactExport(test_base.TestBase):

    def test_contact_export(self):
        result = self.user_post('/api/lists', json={
            "name": "test_contact_export"
        })

        lid = result['id']

        email = 'ethel@petpsychic.com'
        cid = result['cid']

        self.user_post(f'/api/lists/{lid}/feed', json={
            'email': email,
            'tags': ['buyer', 'shopper'],
            'data': {
                'First Name': 'Ethel',
                'Last Name': 'Test'
            }
        })

        result = self.user_post('/api/contactexport', json={
            'email': email,
            'erase': False
        })

        exportid = result['id']

        export = self.db.exports.get(exportid)

        assert export['complete'] == True
        assert export['count'] == 1
        
        comps = export['url'].split('/')

        path = "/".join(comps[-3:])

        zip = zipfile.ZipFile(f"/buckets/transfer/{path}")
        names = zip.namelist()

        assert len(names) == 1

        with zip.open(names[0]) as fp:
            data = json.loads(fp.read())

        assert data['data']['email'] == email
        assert data['data']['lists'] == [lid]
        assert data['data']['tags'] == ["buyer", "shopper"]
        assert data['data']['properties']['First Name'] == "Ethel"

        self.db.execute(f"""insert into unsublogs (cid, email, rawhash, unsubscribed, complained, bounced) values (%s, %s, (select contact_id from contacts."contacts_{cid}" where email = %s), true, false, false)""", cid, email, email)

        self.user_post('/api/contactexport', json={
            'email': email,
            'erase': True
        })

        assert self.db.single("select unsubscribed from unsublogs where cid = %s and email = %s", cid, email) is None
