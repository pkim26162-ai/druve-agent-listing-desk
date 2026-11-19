# 온라인 매물 광고 규정 (Listing Desk가 참고하는 규칙)

Fetched 2026-11-19 from the official 국가법령정보센터 (law.go.kr), read in a real browser because the site renders its text with JavaScript.
These are the rules the agent's **rule check** is built on. Re-fetch before relying on them after any amendment. The agent prints "규정 기준일" from `RULES_AS_OF` in `index.mjs` on every ad result.

**Correction to earlier notes:** the 시행령 article for online ad items is **제17조의2** (not 제17조의3, which is about outsourcing ad monitoring).

## VERIFIED (read from the official text)

### 공인중개사법 [시행 2026. 8. 28.] 제18조의2 (중개대상물의 표시·광고)
- ① 광고 시 **중개사무소, 개업공인중개사에 관한 사항**(대통령령이 정하는 사항)을 명시해야 하며, **중개보조원에 관한 사항은 명시해서는 아니 된다.**
- ② **인터넷**으로 광고할 때는 ①의 사항 외에 중개대상물 종류별로 대통령령이 정하는 소재지, 면적, 가격 등을 명시해야 한다.
- ③ 개업공인중개사가 아닌 자는 중개대상물 광고를 해서는 아니 된다.
- ④ 부당한 광고 금지: (1) 존재하지 않아 실제로 거래할 수 없는 중개대상물, (2) 가격 등을 **사실과 다르게 거짓으로 표시하거나 사실을 과장**하는 광고, (3) 그 밖에 부동산거래질서를 해치거나 중개의뢰인에게 피해를 줄 우려가 있는 것으로 대통령령이 정하는 광고.
- ⑤ 세부 유형은 국토교통부 고시.

### 공인중개사법 제51조 ② (과태료)
- 제18조의2제4항 각 호를 위반해 부당한 표시·광고를 한 자: **500만원 이하의 과태료.**

### 공인중개사법 시행령 [시행 2026. 8. 28.] 제17조의2 (중개대상물의 표시·광고)
- ① 명시 사항: 1) 중개사무소의 **명칭, 소재지, 연락처 및 등록번호**, 2) **개업공인중개사의 성명**(법인은 대표자 성명).
- ② 인터넷 광고 명시 사항: 1) 소재지 2) 면적 3) 가격 4) 중개대상물 종류 5) 거래 형태 6) **건축물인 경우**: 가) 총 층수 나) 사용승인·사용검사·준공검사 등을 받은 날 다) **방향, 방의 개수, 욕실의 개수, 입주가능일, 주차대수 및 관리비**.
- ④ 부당 광고(대통령령): 1) 존재하지만 **실제로 중개의 대상이 될 수 없는** 물건, 2) 존재하지만 **실제로 중개할 의사가 없는** 물건, 3) 입지조건, 생활여건, 가격, 거래조건 등 **선택에 중요한 영향을 미치는 사실을 빠뜨리거나 은폐·축소**해 소비자를 속이는 광고.

### 국토교통부고시 제2026-345호 「부당한 중개대상물 표시·광고행위의 유형 및 기준」 [시행 2026. 7. 3.]
- 제4조: 고시에 열거되지 않았다고 부당 광고가 아닌 것은 아니다(예시일 뿐).
- 제5조 ② 5호: 계약이 체결되었다는 사실을 국토부장관, 시·도지사, 등록관청 등으로부터 통보받은 개업공인중개사가 **통보를 받은 날부터 3일 이내에 광고를 삭제하지 않은 경우**(정보통신망 통보는 통보받을 자가 동의한 경우만). 같은 조 ② 2호: **이미 계약이 체결된 물건임을 알고도 광고**하는 경우는 별도로 부당.
- 제5조 ② 1호: 권리가 있는 자(매도인·임대인 등)가 중개의뢰하지 않았는데 임의로 광고(공동중개 허용 예외).
- 제6조 ① **거짓**: 가격을 중개의뢰인이 의뢰한 가격과 다르게 표시 / 면적을 **공부상 면적**과 다르게 표시 / 해당 물건의 평면도·사진이 아닌 것을 사용 / 토지 용도를 지목과 다르게 표시.
- 제6조 ② **과장**: 옵션 성능을 실제와 다르게 / 관리비 총액이 최근 3개월·1년 평균 또는 직전 월과 현저히 다름 / 방향이 광고와 90도 이상 차이 / **교통시설과의 거리를 도보거리·시간이 아니라 직선거리로 표시**.
- 제7조 **기만**: 선택에 중요한 사실의 전부 또는 일부를 **지나치게 작은 글씨로 표기하거나 빠뜨리거나, 지나치게 생략**해 사실대로 인식하기 어렵게 표시.

Sources:
- https://www.law.go.kr/법령/공인중개사법/제18조의2
- https://www.law.go.kr/법령/공인중개사법시행령/제17조의3 (page shows the whole 시행령; 제17조의2 is the article quoted above)
- https://www.law.go.kr/행정규칙/부당한중개대상물표시·광고행위의유형및기준

## UNVERIFIED (do NOT present as law in the agent)

- The **50만원 이하 과태료** for missing required items (seen in a news report, not yet found in the official 별표 2 or 법 text). Agent copy must not state it.
- Any list of **banned words** such as "최저가", "100%", "무조건", "최고". These are **our own caution list**, written to catch the "사실을 과장" risk in 제18조의2 ④ 2호. The agent must call them "과장으로 보일 수 있는 표현" and never say they are illegal.
- Platform-specific rules of 네이버 부동산, 직방 or 다방 (their own ad policies were not checked).
- Commission (중개보수) tables. Not used by this agent.

## How the agent uses this

| Rule source | What the agent does |
|---|---|
| 시행령 17조의2 ② (required items) | `REQUIRED_FOR_AD`: 소재지, 면적, 가격, 종류, 거래형태, and for buildings 총 층수, 사용승인일, 방향, 방 개수, 욕실 개수, 입주가능일, 주차대수, 관리비. Missing ones are asked for, never filled. |
| 시행령 17조의2 ① | Adds a fill-in line for the office's 명칭, 소재지, 연락처, 등록번호 and 대표 성명 (the agent never knows these). |
| 법 18조의2 ① | Flags any 중개보조원 name or phone found in the notes: "중개보조원에 관한 사항은 광고에 쓸 수 없어요". |
| 고시 6조 ① | Reminders: price must equal the client's requested price; area must match 공부상 면적; photos must be of this unit. |
| 고시 6조 ② | Flags 직선거리 phrasing ("역에서 300m") and asks for walking basis; reminds to confirm direction and options. |
| 고시 7조 / 시행령 17조의2 ④ 3호 | If the card lists 융자/근저당, 하자, 소음 or other notes, the ad must carry them. Missing ones are flagged. |
| 고시 5조 ② | Close-out step: take the ad down; the notice-then-3-days rule is quoted with its source. |
