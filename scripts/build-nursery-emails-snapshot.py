"""園マスタ_通知シート → public/snapshots/nursery-emails.json 生成

ax-dashboard クライアント側の「メール送信」ボタンで使用するため、
園長メアド一覧を静的JSONに書き出す。Basic認証下なので公開して問題ない。

実行: C:/Python314/python.exe scripts/build-nursery-emails-snapshot.py
"""
from __future__ import annotations
import sys, json, glob
sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path
from datetime import datetime, timezone, timedelta

repo_root = Path(__file__).resolve().parents[1]
sou_root = repo_root.parent.parent

sa_file = None
for f in glob.glob(str(sou_root / 'documents/*.json')):
    try:
        d = json.loads(Path(f).read_text(encoding='utf-8'))
        if d.get('type') == 'service_account':
            sa_file = f; break
    except Exception:
        pass
if not sa_file:
    print('ERROR: service account JSON not found')
    sys.exit(1)

import gspread
gc = gspread.service_account(filename=sa_file)
sh = gc.open_by_key('1JcmgUo0kGim_5ojtE8C3Mhn8IXL4Dmh7LMuLFJi5ygc')
ws = sh.worksheet('園マスタ_通知')
all_values = ws.get_all_values()

# 設定欄 (1-4行目) から共通CC・BCC取得
config = {}
for row in all_values[:5]:
    if len(row) > 1 and '共通本社CC' in row[0]:
        config['commonCc'] = row[1].strip()
    if len(row) > 1 and '浅野BCC' in row[0]:
        config['asanoBcc'] = row[1].strip()
    if len(row) > 5 and '送信元' in row[4]:
        config['fromAddress'] = row[5].strip()

# 園データ (6行目以降)
nurseries = {}
for row in all_values[6:]:
    if len(row) < 7: continue
    name = row[0].strip()
    if not name: continue
    brand = row[1].strip()
    director = row[2].strip()
    email = row[3].strip()
    individual_cc = row[4].strip()
    city_code = row[5].strip()
    notify_on = row[6].strip().upper() == 'TRUE'
    pattern_force = row[7].strip() if len(row) > 7 else ''

    if not email:
        continue  # メアド未設定はスキップ

    nurseries[name] = {
        'email': email,
        'brand': brand,
        'director': director,
        'individualCc': individual_cc,
        'cityCode': city_code,
        'notifyEnabled': notify_on,
        'patternForced': pattern_force,
    }

jst = timezone(timedelta(hours=9))
output = {
    'generatedAt': datetime.now(jst).isoformat(),
    'config': config,
    'nurseries': nurseries,
}

out_path = repo_root / 'public' / 'snapshots' / 'nursery-emails.json'
out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding='utf-8')

print(f'Written: {out_path}')
print(f'  Nurseries with email: {len(nurseries)}')
print(f'  Common CC set: {bool(config.get("commonCc"))}')
print(f'  From address set: {bool(config.get("fromAddress"))}')
