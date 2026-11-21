"""TV do Congresso: composição offline; nunca lê ou altera o Firebase.

python render_tv.py --snapshot <pasta> --assets <pasta> --output <video.mp4>
Assets: Bricolage.ttf, Figtree.ttf, JetBrains.ttf e emojis/0.png..7.png.
Ilustrações sem foto: mural/ilustracao-<id>.png dentro do snapshot.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
from functools import lru_cache
from datetime import datetime, timedelta, timezone

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

W, H, FPS = 1920, 1080, 30
BG, SURFACE, LINE = '#120f1b', '#1d1829', '#332c46'
INK, MUTED, RED, GOLD = '#f1eef8', '#aaa3bc', '#ff4d68', '#e2bd52'
SP = timezone(timedelta(hours=-3))
LABELS = ['Amor', 'Coração partido', 'Cobra', 'Ranço', 'Mala', 'Biscoito', 'Mentira', 'Alvo', 'Planta']


class TV:
    def __init__(self, snapshot, assets, output):
        self.root, self.assets, self.out = snapshot, assets, output
        self.data = json.loads((snapshot / 'dados-tv.json').read_text(encoding='utf-8'))
        self.people = {p['id']: p for p in self.data['participants']}
        self.stamp = datetime.fromisoformat(self.data['capturedAt'].replace('Z', '+00:00')).astimezone(SP)
        self.slides = output.parent / 'telas'
        self.slides.mkdir(parents=True, exist_ok=True)
        self.bounds = []
        self.validate()

    def validate(self):
        ids = set(self.people)
        assert len(ids) == len(self.data['participants']), 'Participante duplicado'
        ranks = self.data['scoreboard']['rows']
        assert len(ranks) == len(ids) and {r['id'] for r in ranks} == ids
        assert [r['position'] for r in ranks] == list(range(1, len(ranks) + 1))
        assert all(a['points'] >= b['points'] for a, b in zip(ranks, ranks[1:]))
        q = self.data['queridometro']
        if q:
            assert q['closed'], 'Nunca divulgar votos antes do encerramento'
            assert len(q['rows']) == q['eligible']
            assert sum(sum(r['counts'].values()) for r in q['rows']) == q['voters'] * (q['eligible'] - 1)
        for c in self.data['mural']['cases']:
            assert c['status'] == 'ok' and c['who'] in ids
            illustration = 'mural/ilustracao-' + c['id'] + '.png'
            assert (self.root / (c['photo'] or illustration)).is_file(), 'Falta imagem/ilustração do caso ' + c['id']

    @lru_cache(maxsize=96)
    def font(self, family, size, weight=500):
        filename = {'head': 'Bricolage.ttf', 'body': 'Figtree.ttf', 'num': 'JetBrains.ttf'}[family]
        f = ImageFont.truetype(str(self.assets / filename), size)
        try:
            values = []
            for axis in f.get_variation_axes():
                name = axis['name'].decode().lower()
                value = weight if 'weight' in name else (100 if 'width' in name else min(size, 96) if 'optical' in name else axis['default'])
                values.append(max(axis['minimum'], min(axis['maximum'], value)))
            f.set_variation_by_axes(values)
        except (AttributeError, OSError):
            pass
        return f

    def text(self, im, text, x, y, size=36, color=INK, family='body', weight=500, anchor='lt'):
        d = ImageDraw.Draw(im)
        f = self.font(family, size, weight)
        box = d.textbbox((x, y), text, font=f, anchor=anchor)
        assert min(box[:2]) >= 0 and box[2] <= W and box[3] <= H, ('Texto fora da tela', text, box)
        self.bounds.append({'text': text, 'bbox': box})
        d.text((x, y), text, font=f, fill=color, anchor=anchor)

    def wrap(self, text, width, size=48, family='body', weight=500):
        f = self.font(family, size, weight)
        lines, line = [], ''
        for word in text.split():
            proposed = (line + ' ' + word).strip()
            if f.getlength(proposed) > width and line:
                lines.append(line)
                line = word
            else:
                line = proposed
            assert f.getlength(line) <= width, 'Palavra maior que o espaço disponível'
        return lines + ([line] if line else [])

    def paragraph(self, im, text, x, y, width, size=48, color=INK, weight=500, line_height=None):
        lines = self.wrap(text, width, size, weight=weight)
        leading = line_height or round(size * 1.25)
        for i, line in enumerate(lines):
            self.text(im, line, x, y + i * leading, size, color, weight=weight)
        return y + len(lines) * leading

    def avatar(self, im, person_id, x, y, size):
        p = self.people[person_id]
        photo = Image.open(self.root / p['photo']).convert('RGB')
        if p.get('frame'):
            fw, fh, fx, fy, fs = p['frame']
            sx, sy = photo.width / fw, photo.height / fh
            photo = photo.crop((round(fx * sx), round(fy * sy), round((fx + fs) * sx), round((fy + fs) * sy)))
        photo = ImageOps.fit(photo, (size, size), Image.Resampling.LANCZOS)
        mask = Image.new('L', (size, size), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
        im.paste(photo, (x, y), mask)
        ImageDraw.Draw(im).ellipse((x, y, x + size, y + size), outline=LINE, width=3)

    def base(self, title, subtitle, section):
        im = Image.new('RGB', (W, H), BG)
        d = ImageDraw.Draw(im)
        d.ellipse((1400, -430, 2230, 400), outline='#201a2d', width=2)
        d.ellipse((1440, -390, 2190, 360), outline='#201a2d', width=2)
        self.text(im, 'XVI CONGRESSO MONOGÂMICO', 96, 55, 25, RED, weight=700)
        self.text(im, title, 96, 106, 86, family='head', weight=750)
        self.text(im, subtitle, 99, 205, 31, MUTED)
        self.text(im, section, 1824, 63, 26, MUTED, family='num', anchor='rt')
        d.line((96, 984, 1824, 984), fill=LINE, width=2)
        self.text(im, 'COMORG • A VIAGEM ACONTECE AQUI', 96, 1011, 23, MUTED, weight=600)
        self.text(im, 'Atualizado em ' + self.stamp.strftime('%d/%m às %H:%M'), 1824, 1009, 26, MUTED, anchor='rt')
        return im

    def emoji(self, im, idx, x, y, size=70):
        icon = Image.open(self.assets / 'emojis' / f'{idx}.png').convert('RGBA')
        icon = ImageOps.contain(icon, (size, size), Image.Resampling.LANCZOS)
        im.paste(icon, (round(x + (size - icon.width) / 2), round(y + (size - icon.height) / 2)), icon)

    def querido(self, rows, index, pages):
        q = self.data['queridometro']
        date = datetime.fromisoformat(q['date']).strftime('%d/%m')
        im = self.base('Queridômetro', f'RODADA DE {date}  •  {q["voters"]} VOTANTES', f'{index + 1:02}/{pages:02}')
        d = ImageDraw.Draw(im)
        for col, row in enumerate(rows):
            x, y, width = 96 + col * 884, 278, 844
            d.rounded_rectangle((x, y, x + width, 942), radius=28, fill=SURFACE, outline=LINE, width=2)
            self.avatar(im, row['id'], x + 38, y + 34, 128)
            self.text(im, row['nick'], x + 194, y + 49, 65, family='head', weight=700)
            total = sum(row['counts'].values())
            self.text(im, f'{total} emojis recebidos', x + 196, y + 127, 27, MUTED)
            columns = 3 if len(q['emojis']) == 9 else 4
            cells = math.ceil(len(q['emojis']) / columns)
            cell_w = (width - 68 - (columns - 1) * 15) // columns
            cell_h = min(180, (438 - 24 - (cells - 1) * 16) // cells)
            for j, e in enumerate(q['emojis']):
                cx, cy = x + 34 + (j % columns) * (cell_w + 15), y + 226 + (j // columns) * (cell_h + 16)
                n = row['counts'].get(e, 0)
                d.rounded_rectangle((cx, cy, cx + cell_w, cy + cell_h), radius=19, fill='#252031', outline='#3c334a' if n else LINE, width=1)
                icon_size = 58 if cells > 2 else 70
                self.emoji(im, j, cx + (cell_w - icon_size) // 2, cy + 12, icon_size)
                self.text(im, str(n), cx + cell_w // 2, cy + (78 if cells > 2 else 105), 42 if cells > 2 else 53, GOLD if n else '#70687e', 'num', weight=650, anchor='mt')
        if len(rows) == 1:
            self.highlights(im)
        return im

    def highlights(self, im):
        x = 980
        d = ImageDraw.Draw(im)
        d.rounded_rectangle((x, 278, 1824, 942), radius=28, fill=SURFACE, outline=LINE, width=2)
        self.text(im, 'Destaques da rodada', x + 40, 316, 46, family='head', weight=700)
        q = self.data['queridometro']
        for k, (j, label) in enumerate([(0, 'Corações'), (2, 'Cobras'), (4, 'Malas'), (7, 'Alvos')]):
            e, y = q['emojis'][j], 410 + k * 126
            peak = max(r['counts'].get(e, 0) for r in q['rows'])
            names = ', '.join(r['nick'] for r in q['rows'] if r['counts'].get(e, 0) == peak) if peak else 'Nenhum voto'
            self.emoji(im, j, x + 40, y, 64)
            self.text(im, f'{label} • {peak}' + (' para cada' if ',' in names else ''), x + 126, y + 1, 25, GOLD, weight=650)
            self.paragraph(im, names, x + 126, y + 37, 660, size=32, line_height=38)

    def placar(self):
        subtitle = 'CLASSIFICAÇÃO GERAL' + ('  •  ENCERRADA' if self.data['scoreboard']['closedAt'] else '')
        im = self.base('Placar do congresso', subtitle, 'PLACAR')
        d = ImageDraw.Draw(im)
        for i, row in enumerate(self.data['scoreboard']['rows']):
            col, line = divmod(i, 7)
            x, y = 96 + col * 884, 278 + line * 94
            top = row['position'] <= 3
            d.rounded_rectangle((x, y, x + 844, y + 82), radius=16, fill='#2a2230' if top else SURFACE, outline='#5c4c37' if top else LINE, width=1)
            self.text(im, f'{row["position"]:02}', x + 24, y + 25, 34, GOLD if top else MUTED, 'num', weight=600)
            self.avatar(im, row['id'], x + 92, y + 10, 62)
            self.text(im, row['nick'], x + 180, y + 21, 42, weight=650)
            self.text(im, str(row['points']), x + 758, y + 16, 49, GOLD if top else INK, 'num', weight=700, anchor='rt')
            self.text(im, 'PTS', x + 782, y + 34, 18, MUTED, weight=650)
        return im

    def mural(self, case, index):
        im = self.base('Mural da vergonha', 'ARQUIVO DA COMORG', f'CASO {index + 1:02}')
        d = ImageDraw.Draw(im)
        is_photo = bool(case['photo'])
        file = case['photo'] or 'mural/ilustracao-' + case['id'] + '.png'
        source = Image.open(self.root / file).convert('RGB')
        box = (96, 278, 1144, 942)
        d.rounded_rectangle(box, radius=20, fill='#24202c', outline=LINE, width=2)
        fitted = ImageOps.contain(source, (box[2] - box[0] - 8, box[3] - box[1] - 8), Image.Resampling.LANCZOS)
        im.paste(fitted, (box[0] + (box[2] - box[0] - fitted.width) // 2, box[1] + (box[3] - box[1] - fitted.height) // 2))
        self.text(im, 'REGISTRO ORIGINAL' if is_photo else 'RECONSTITUIÇÃO ILUSTRADA', 1188, 287, 24, RED, weight=700)
        self.avatar(im, case['who'], 1188, 351, 96)
        self.text(im, case['nick'], 1312, 362, 63, family='head', weight=700)
        end_y = self.paragraph(im, case['description'], 1188, 496, 622, size=48, line_height=62)
        assert end_y <= 826, 'Descrição do mural muito longa: precisa de nova paginação'
        if case['penalty'] is not None:
            d.rounded_rectangle((1188, 852, 1452, 934), radius=20, fill='#3b1e30', outline='#693145', width=1)
            self.text(im, f'{case["penalty"]} PONTOS', 1320, 876, 35, RED, 'num', weight=700, anchor='mt')
        return im

    def prepare(self):
        unique, timeline = {}, []
        q = self.data['queridometro']
        rows = q['rows'] if q else []
        pages = math.ceil(len(rows) / 2)
        cases = self.data['mural']['cases']
        unique['placar'] = self.placar()
        for i, case in enumerate(cases):
            unique[f'mural-{i + 1:02}'] = self.mural(case, i)
        shown = 0
        for i in range(pages):
            key = f'queridometro-{i + 1:02}'
            unique[key] = self.querido(rows[i * 2:i * 2 + 2], i, pages)
            timeline.append({'key': key, 'seconds': 8})
            if (i + 1) % 2 == 0 or i == pages - 1:
                timeline.append({'key': 'placar', 'seconds': 12})
                if cases:
                    timeline.append({'key': f'mural-{shown % len(cases) + 1:02}', 'seconds': 10})
                    shown += 1
        if not pages:
            timeline.append({'key': 'placar', 'seconds': 12})
        while shown < len(cases):
            timeline.extend([{'key': f'mural-{shown + 1:02}', 'seconds': 10}, {'key': 'placar', 'seconds': 12}])
            shown += 1
        for key, im in unique.items():
            im.save(self.slides / (key + '.png'))
        thumbs = Image.new('RGB', (960, math.ceil(len(unique) / 2) * 294), BG)
        d = ImageDraw.Draw(thumbs)
        for i, (key, im) in enumerate(unique.items()):
            x, y = (i % 2) * 480, (i // 2) * 294
            thumbs.paste(im.resize((480, 270), Image.Resampling.LANCZOS), (x, y))
            d.text((x + 10, y + 273), key, font=self.font('body', 16), fill=INK)
        thumbs.save(self.out.parent / 'contato-telas.jpg', quality=90)
        report = {
            'capturedAt': self.data['capturedAt'], 'size': [W, H], 'fps': FPS,
            'durationSeconds': sum(s['seconds'] for s in timeline), 'transitionSeconds': 0.5,
            'loop': 'Últimos 15 frames se dissolvem na primeira tela, sem preto/interrupção',
            'timeline': timeline, 'slides': list(unique),
            'snapshotSHA256': hashlib.sha256((self.root / 'dados-tv.json').read_bytes()).hexdigest(),
            'textBoundsChecked': len(self.bounds),
        }
        (self.out.parent / 'manifesto-video.json').write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
        return unique, timeline, report

    def encode(self, unique, timeline, ffmpeg):
        log = self.out.parent / 'ffmpeg-render.log'
        command = [ffmpeg, '-hide_banner', '-y', '-f', 'rawvideo', '-vcodec', 'rawvideo', '-pix_fmt', 'rgb24',
                   '-s', f'{W}x{H}', '-r', str(FPS), '-i', 'pipe:0', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
                   '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
                   '-profile:v', 'high', '-level:v', '4.1', '-pix_fmt', 'yuv420p', '-threads', '4',
                   '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', str(self.out)]
        with log.open('w', encoding='utf-8') as stderr:
            proc = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=stderr)
            try:
                for i, scene in enumerate(timeline):
                    im = unique[scene['key']]
                    raw = im.tobytes()
                    frames, fade = scene['seconds'] * FPS, 15
                    for _ in range(frames - fade):
                        proc.stdin.write(raw)
                    other = np.asarray(unique[timeline[(i + 1) % len(timeline)]['key']], dtype=np.float32)
                    current = np.asarray(im, dtype=np.float32)
                    for j in range(1, fade + 1):
                        alpha = (1 - math.cos(math.pi * j / fade)) / 2
                        proc.stdin.write(np.round(current * (1 - alpha) + other * alpha).astype(np.uint8).tobytes())
                    print(f'{i + 1}/{len(timeline)} {scene["key"]}', flush=True)
            finally:
                proc.stdin.close()
            assert proc.wait() == 0, 'Falha no FFmpeg. Consulte ' + str(log)
        print('Pronto: ' + str(self.out), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot', type=Path, required=True)
    parser.add_argument('--assets', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--ffmpeg', default=os.environ.get('FFMPEG'))
    parser.add_argument('--preview-only', action='store_true')
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    tv = TV(args.snapshot.resolve(), args.assets.resolve(), args.output.resolve())
    unique, timeline, report = tv.prepare()
    print(json.dumps(report, ensure_ascii=False), flush=True)
    if not args.preview_only:
        ffmpeg = args.ffmpeg or shutil.which('ffmpeg')
        if not ffmpeg:
            import imageio_ffmpeg
            ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        tv.encode(unique, timeline, ffmpeg)


if __name__ == '__main__':
    main()
