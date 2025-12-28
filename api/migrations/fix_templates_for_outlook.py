import re


def run(db):
    for table in [
        "forms",
        "formtemplates",
        "gallerytemplates",
        "campaigns",
        "messages",
    ]:
        for id, txt in list(
            db.execute(
                f"""select id, data::text from {table} where coalesce(data->>'type', '') = ''"""
            )
        ):
            fixed = re.sub(
                r'<div style=\\"',
                r"<table style=\"border: 0; margin: 0; padding: 0; width: 100%; border-spacing: 0; border-collapse: collapse\"><tr style=\"padding: 0; border-spacing: 0; border-collapse: collapse\"><td style=\"padding: 0; border-spacing: 0; border-collapse: collapse; ",
                txt,
            )
            fixed = re.sub(
                r"<div>",
                r"<table style=\"border: 0; margin: 0; padding: 0; width: 100%; border-spacing: 0; border-collapse: collapse\"><tr style=\"padding: 0; border-spacing: 0; border-collapse: collapse\"><td style=\"padding: 0; border-spacing: 0; border-collapse: collapse;\">",
                fixed,
            )
            fixed = re.sub(r"</div>", "</td></tr></table>", fixed)
            fixed = re.sub(
                r"<center>",
                r"<table style=\"border: 0; margin: 0; padding: 0; width: 100%; border-spacing: 0; border-collapse: collapse\"><tr style=\"padding: 0; border-spacing: 0; border-collapse: collapse\"><td style=\"padding: 0; border-spacing: 0; border-collapse: collapse; text-align: center\">",
                fixed,
            )
            fixed = re.sub(r"</center>", "</td></tr></table>", fixed)

            db.execute(
                f"""update {table} set data = %s::jsonb where id = %s""", fixed, id
            )
