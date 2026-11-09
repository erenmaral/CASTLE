# Play Store mağaza girişi metinlerini fastlane "supply" düzeninde üretir:  python3 store/build-listing.py
# Çıktı: store/metadata/android/<yerel>/{title,short_description,full_description}.txt  (Play Console'a elle yapıştırılabilir ya da fastlane ile yüklenir)
import os
L = {}
L['en-US'] = dict(
 title='Castle Siege: History',
 short='Command your camp army and storm 105 real historical castle sieges.',
 full="""Lead an army out of your camp and storm the castles of history.

Every level is a real siege: Orléans 1429, Acre 1291, Constantinople 1453, Malta 1565, Vienna 1683 and 100 more, from antiquity to the early 20th century. Read the short history note, pick your soldiers and break the walls.

TWO KINDS OF BATTLE
• Castle siege: three lanes, a castle on the far side and your camp on yours. Time your troops, use your hero's skills and bring down the keep.
• Field battle: place your army in front of the fortress, take the flag positions, cross the river fords and defeat the garrison commander.

SIEGE RULES THAT CHANGE EVERY FIGHT
Moat, Relief Army, Blockade, Strong Walls, Famine, Ambush and more. When the castle falls below half health a breach opens and your assault hits harder.

BUILD YOUR ARMY
• 11 unit types: spearmen, archers, knights, cavalry, healers, banner bearers, mages, catapults, assassins, golems and flamers
• Upgrade every unit, strengthen your camp and unlock 5 heroes with their own skills
• Daily sieges, quests, achievements, a lucky wheel and treasure chests
• Auto-battle and 3× speed when you want to move fast

PLAY YOUR WAY
• Works offline, no account needed
• Portrait, one-handed play
• 6 languages: English, Türkçe, Español, Português, Русский, 简体中文

Free to play. Contains optional ads and in-app purchases (gem packs, starter pack, remove ads). Fantasy units and cartoon-style battles; the history notes are short, simplified summaries.""")
L['tr-TR'] = dict(
 title='Kale Kuşatması: Tarih',
 short='Kampından ordunu yönet, tarihteki 105 gerçek kale kuşatmasına saldır.',
 full="""Ordunu kampından çıkar, tarihin kalelerine saldır.

Her bölüm gerçek bir kuşatma: Orléans 1429, Akka 1291, İstanbul 1453, Malta 1565, Viyana 1683 ve 100 tane daha; Antik çağdan 20. yüzyıl başına kadar. Kısa tarih notunu oku, askerlerini seç ve surları yık.

İKİ SAVAŞ TÜRÜ
• Kale kuşatması: üç koridor, karşıda düşman kalesi, bu tarafta senin kampın. Birliklerini zamanla, kahramanının yeteneklerini kullan ve kaleyi yık.
• Kale önü muharebesi: ordunu kalenin önüne yerleştir, mevzi bayraklarını ele geçir, nehir geçitlerinden ilerle ve garnizon komutanını yen.

HER SAVAŞI DEĞİŞTİREN KUŞATMA KURALLARI
Hendek, Yardım Ordusu, Abluka, Sağlam Surlar, Kıtlık, Pusu ve daha fazlası. Kale canının yarısının altına inince gedik açılır ve saldırın daha sert vurur.

ORDUNU KUR
• 11 birlik türü: mızraklı, okçu, şövalye, süvari, şifacı, sancaktar, büyücü, mancınık, suikastçı, golem ve alev atıcı
• Her birliği geliştir, kampını güçlendir, kendi yeteneklerine sahip 5 kahramanın kilidini aç
• Günlük kuşatma, görevler, başarımlar, şans çarkı ve hazine sandıkları
• Hızlı ilerlemek istediğinde oto-savaş ve 3× hız

KENDİ TARZINDA OYNA
• Çevrimdışı çalışır, hesap gerekmez
• Dikey ekran, tek elle oynanır
• 6 dil: Türkçe, English, Español, Português, Русский, 简体中文

Ücretsizdir. İsteğe bağlı reklamlar ve uygulama içi satın almalar içerir (elmas paketleri, başlangıç paketi, reklamları kaldır). Fantastik birlikler ve çizgi film tarzı savaşlar vardır; tarih notları kısa ve sadeleştirilmiş özetlerdir.""")
L['es-ES'] = dict(
 title='Asedio de Castillos: Historia',
 short='Dirige tu ejército y asalta 105 asedios históricos reales de castillos.',
 full="""Saca a tu ejército del campamento y asalta los castillos de la historia.

Cada nivel es un asedio real: Orleans 1429, Acre 1291, Constantinopla 1453, Malta 1565, Viena 1683 y 100 más, desde la Antigüedad hasta principios del siglo XX. Lee la breve nota histórica, elige a tus soldados y derriba las murallas.

DOS TIPOS DE BATALLA
• Asedio al castillo: tres carriles, el castillo enemigo al otro lado y tu campamento en el tuyo. Elige el momento de tus tropas, usa las habilidades de tu héroe y derriba la fortaleza.
• Batalla campal: coloca a tu ejército frente a la fortaleza, toma las banderas de posición, cruza los vados del río y derrota al comandante de la guarnición.

REGLAS DE ASEDIO QUE CAMBIAN CADA COMBATE
Foso, Ejército de socorro, Bloqueo, Murallas firmes, Hambruna, Emboscada y más. Cuando el castillo baja de la mitad de su vida se abre una brecha y tu asalto golpea más fuerte.

FORMA TU EJÉRCITO
• 11 tipos de unidad: lanceros, arqueros, caballeros, caballería, sanadores, portaestandartes, magos, catapultas, asesinos, gólems y lanzallamas
• Mejora cada unidad, refuerza tu campamento y desbloquea 5 héroes con habilidades propias
• Asedios diarios, misiones, logros, una ruleta de la suerte y cofres del tesoro
• Combate automático y velocidad ×3 cuando quieras ir rápido

JUEGA A TU MANERA
• Funciona sin conexión y sin cuenta
• Vertical, se juega con una mano
• 6 idiomas: Español, English, Türkçe, Português, Русский, 简体中文

Gratis. Incluye anuncios opcionales y compras dentro de la aplicación (paquetes de gemas, paquete inicial, quitar anuncios). Hay unidades de fantasía y combates de estilo animado; las notas históricas son resúmenes breves y simplificados.""")
L['pt-BR'] = dict(
 title='Cerco de Castelos: História',
 short='Comande seu exército e ataque 105 cercos históricos reais de castelos.',
 full="""Leve seu exército para fora do acampamento e ataque os castelos da história.

Cada fase é um cerco real: Orléans 1429, Acre 1291, Constantinopla 1453, Malta 1565, Viena 1683 e mais 100, da Antiguidade ao início do século XX. Leia a breve nota histórica, escolha seus soldados e derrube as muralhas.

DOIS TIPOS DE BATALHA
• Cerco ao castelo: três corredores, o castelo inimigo do outro lado e o seu acampamento deste. Escolha o momento das tropas, use as habilidades do herói e derrube a fortaleza.
• Batalha campal: posicione o exército diante da fortaleza, tome as bandeiras de posição, atravesse os vaus do rio e derrote o comandante da guarnição.

REGRAS DE CERCO QUE MUDAM CADA LUTA
Fosso, Exército de socorro, Bloqueio, Muralhas firmes, Fome, Emboscada e mais. Quando o castelo cai abaixo da metade da vida, abre-se uma brecha e seu ataque bate mais forte.

MONTE SEU EXÉRCITO
• 11 tipos de unidade: lanceiros, arqueiros, cavaleiros, cavalaria, curandeiros, porta-estandartes, magos, catapultas, assassinos, golens e lança-chamas
• Melhore cada unidade, fortaleça o acampamento e desbloqueie 5 heróis com habilidades próprias
• Cercos diários, missões, conquistas, roleta da sorte e baús de tesouro
• Batalha automática e velocidade 3× quando quiser acelerar

JOGUE DO SEU JEITO
• Funciona offline, sem conta
• Vertical, jogável com uma mão
• 6 idiomas: Português, English, Türkçe, Español, Русский, 简体中文

Gratuito. Contém anúncios opcionais e compras no app (pacotes de gemas, pacote inicial, remover anúncios). Há unidades de fantasia e batalhas em estilo de desenho; as notas históricas são resumos curtos e simplificados.""")
L['ru-RU'] = dict(
 title='Осада замков: История',
 short='Ведите армию из лагеря и штурмуйте 105 реальных исторических осад замков.',
 full="""Выведите армию из лагеря и штурмуйте замки, вошедшие в историю.

Каждый уровень — настоящая осада: Орлеан 1429, Акра 1291, Константинополь 1453, Мальта 1565, Вена 1683 и ещё 100, от античности до начала XX века. Прочитайте краткую историческую справку, выберите солдат и разрушьте стены.

ДВА ТИПА БОЯ
• Осада замка: три полосы, вражеский замок на другой стороне и ваш лагерь на этой. Выбирайте момент для отрядов, применяйте навыки героя и разрушьте крепость.
• Полевое сражение: расставьте армию перед крепостью, захватите позиции с флагами, переправьтесь через броды и победите командира гарнизона.

ПРАВИЛА ОСАДЫ, МЕНЯЮЩИЕ КАЖДЫЙ БОЙ
Ров, Войско помощи, Блокада, Крепкие стены, Голод, Засада и другие. Когда у замка остаётся меньше половины здоровья, образуется брешь, и ваш штурм бьёт сильнее.

СОБЕРИТЕ АРМИЮ
• 11 типов войск: копейщики, лучники, рыцари, конница, лекари, знаменосцы, маги, катапульты, убийцы, големы и огнемётчики
• Улучшайте каждый отряд, укрепляйте лагерь и открывайте 5 героев с собственными навыками
• Ежедневные осады, задания, достижения, колесо удачи и сундуки с сокровищами
• Автобой и ускорение ×3, когда хочется быстрее

ИГРАЙТЕ КАК УДОБНО
• Работает без интернета, аккаунт не нужен
• Вертикальный экран, игра одной рукой
• 6 языков: Русский, English, Türkçe, Español, Português, 简体中文

Бесплатно. Есть необязательная реклама и покупки в приложении (наборы гемов, стартовый набор, отключение рекламы). В игре есть фэнтезийные отряды и мультяшные сражения; исторические справки — краткие упрощённые сводки.""")
L['zh-CN'] = dict(
 title='城堡围攻：历史',
 short='从营地出发，指挥大军攻打105场真实历史上的城堡围攻战。',
 full="""带领大军走出营地，攻陷历史上的名城要塞。

每一关都是一场真实的围攻战：奥尔良1429、阿克里1291、君士坦丁堡1453、马耳他1565、维也纳1683……共105关，从古代到20世纪初。阅读简短的历史注记，挑选士兵，攻破城墙。

两种战斗
• 城堡围攻：三条战线，敌方城堡在对面，你的营地在这一侧。把握出兵时机，运用英雄技能，摧毁敌人的城堡。
• 城前野战：把军队布置在要塞前，夺取旗帜阵地，从河流浅滩推进，击败守军指挥官。

让每场战斗都不同的围攻规则
护城河、援军、封锁、坚固城墙、饥荒、伏击等等。城堡生命降到一半以下时会出现缺口，你的进攻更加凶猛。

打造你的军队
• 11种兵种：长矛兵、弓箭手、骑士、骑兵、治疗师、旗手、法师、投石车、刺客、石像魔和喷火兵
• 升级每种兵种，强化营地，解锁5位拥有专属技能的英雄
• 每日围攻、任务、成就、幸运转盘和宝箱
• 想加快节奏时可用自动战斗和3倍速

随心而玩
• 可离线游玩，无需账号
• 竖屏单手操作
• 6种语言：简体中文、English、Türkçe、Español、Português、Русский

免费游玩。含可选广告和应用内购买（宝石包、新手礼包、移除广告）。游戏含奇幻兵种和卡通风格战斗；历史注记为简短的简化概述。""")
L['es-419'] = L['es-ES']
root = os.path.join(os.path.dirname(__file__), 'metadata', 'android')
for loc, d in L.items():
    p = os.path.join(root, loc); os.makedirs(p, exist_ok=True)
    for k, f in (('title', 'title.txt'), ('short', 'short_description.txt'), ('full', 'full_description.txt')):
        open(os.path.join(p, f), 'w', encoding='utf-8').write(d[k].strip() + '\n')
    print(loc, len(d['title']), len(d['short']), len(d['full'].strip()))
