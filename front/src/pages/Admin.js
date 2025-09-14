import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Modal, Button, Form } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

const Admin = () => {
    const serviceKey =
        "UJwIk6dRRbBUl%2F%2Fx4CaTlCUPXgy5sJHsu%2BqaC1SDrpCBt%2B6fRG75s6BYi6sWJuIRLAGagNh23q8F6y820JW70g%3D%3D";

    const [parks, setParks] = useState([]);
    const [page, setPage] = useState(0);
    const [size, setSize] = useState(15);
    const [totalPages, setTotalPages] = useState(0);
    const [searchFilter, setSearchFilter] = useState("prk_plce_nm");
    const [searchQuery, setSearchQuery] = useState("");

    const [isLive, setIsLive] = useState(false); // 실시간 모드 여부

    // 모달 관련 상태
    const [show, setShow] = useState(false);
    const [mode, setMode] = useState("");
    const [form, setForm] = useState({
        prk_center_id: "",
        prk_plce_nm: "",
        prk_plce_adres: "",
        prk_plce_entrc_la: "",
        prk_plce_entrc_lo: "",
    });

    // DB 데이터 가져오기
    const fetchParks = async () => {
        try {
            const res = await axios.get("/api/parks", {
                params: { page, size, searchFilter, searchQuery },
            });
            setParks(res.data.content);
            setTotalPages(res.data.totalPages);
        } catch (err) {
            console.error("DB 조회 실패", err);
        }
    };

    // 실시간 데이터 가져오기 (검색+페이징)
    const fetchLive = async () => {
        try {
            const response = await fetch(
                `http://apis.data.go.kr/B553881/Parking/PrkRealtimeInfo?serviceKey=${serviceKey}&numOfRows=500&pageNo=1&format=2`
            );
            const result = await response.json();
            let list = result.PrkSttusInfo || [];

            // 검색 필터 적용
            if (searchQuery) {
                list = list.filter((p) => {
                    const val =
                        searchFilter === "prk_center_id"
                            ? p.prk_center_id
                            : searchFilter === "pkfc_ParkingLots_total"
                                ? String(p.pkfc_ParkingLots_total)
                                : String(p.pkfc_Available_ParkingLots_total);
                    return val && val.toLowerCase().includes(searchQuery.toLowerCase());
                });
            }

            // 페이지 처리
            const start = page * size;
            const end = start + size;
            const sliced = list.slice(start, end);

            setParks(sliced);
            setTotalPages(Math.ceil(list.length / size));
        } catch (err) {
            console.error("실시간 조회 실패", err);
        }
    };

    // 실시간 DB 저장 버튼 클릭

    const saveLiveToDB2 = async () => {
        /*
        console.log("실시간 데이터 추출 시작")
        const response = await fetch(
            `http://apis.data.go.kr/B553881/Parking/PrkRealtimeInfo?serviceKey=${serviceKey}&numOfRows=10000&pageNo=1&format=2`
        );

        const text = await response.text();
        console.log(text); // JSON인지, HTML 에러인지 확인
        */
        try {
            // 전체 데이터를 가져와서 저장
            const response = await fetch(
                `http://apis.data.go.kr/B553881/Parking/PrkRealtimeInfo?serviceKey=${serviceKey}&numOfRows=500&pageNo=1&format=2`
            );
            const result = await response.json();
            const list = result.PrkRealtimeInfo || [];
            console.log(list);

            if (list.length > 0) {
                await axios.post("/api/live/bulk", list);
                alert(`${list.length}건 실시간 데이터 DB 저장 완료`);
                setIsLive(true); // 저장 후 실시간 정보 모드로 전환
                setPage(0);       // 페이지 초기화
                fetchLive();      // 테이블 표시
            } else {
                alert("실시간 데이터가 없습니다.");
            }
        } catch (err) {
            console.error("실시간 데이터 저장 실패", err);
            alert("실시간 데이터 저장 실패");
        }
    };

    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 2000; // 2초 간격으로 재시도

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const saveLiveToDB = async () => {
        console.log("실시간 데이터 추출 시작");

        let attempts = 0;
        let success = false;
        let responseText = '';

        while (attempts < MAX_RETRIES && !success) {
            try {
                const response = await fetch(
                    `http://apis.data.go.kr/B553881/Parking/PrkRealtimeInfo?serviceKey=${serviceKey}&numOfRows=10000&pageNo=1&format=2`
                );

                responseText = await response.text();
                console.log(`응답 시도 ${attempts + 1}:`, responseText);

                // 에러 응답인지 확인 (문자열 파싱)
                if (responseText.includes('<returnReasonCode>04</returnReasonCode>')) {
                    throw new Error("공공 API 라우팅 에러 감지됨");
                }

                // 정상 응답이라면 JSON 파싱 시도
                const data = JSON.parse(responseText);

                // 실제 데이터를 DB에 저장하는 로직 여기에 추가
                console.log("데이터 저장 완료:", data);

                success = true; // 성공 처리
            } catch (err) {
                console.error(`시도 ${attempts + 1} 실패:`, err.message);
                attempts += 1;
                if (attempts < MAX_RETRIES) {
                    console.log(`${RETRY_DELAY_MS / 1000}초 후 재시도 중...`);
                    await delay(RETRY_DELAY_MS);
                } else {
                    console.error("최대 재시도 횟수 도달. 중단합니다.");
                }
            }
        }
    };
    useEffect(() => {
        if (isLive) {
            fetchLive();
        } else {
            fetchParks();
        }
    }, [page, searchFilter, searchQuery, isLive]);

    const handleSearch = () => {
        setPage(0);
        if (isLive) fetchLive();
        else fetchParks();
    };

    const openModal = (m, park = null) => {
        setMode(m);
        setShow(true);
        if (park) setForm(park);
        else
            setForm({
                prk_center_id: "",
                prk_plce_nm: "",
                prk_plce_adres: "",
                prk_plce_entrc_la: "",
                prk_plce_entrc_lo: "",
            });
    };
    const closeModal = () => {
        setShow(false);
        setForm({});
    };
    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
    const handleSubmit = async () => {
        try {
            if (mode === "insert") {
                await axios.post("/api/insert", form);
                setParks((prev) => [...prev, form]);
            } else if (mode === "update") {
                await axios.put(`/api/update/${form.prk_center_id}`, form);
                setParks((prev) =>
                    prev.map((p) =>
                        p.prk_center_id === form.prk_center_id ? form : p
                    )
                );
            } else if (mode === "delete") {
                await axios.delete(`/api/delete/${form.prk_center_id}`);
                setParks((prev) =>
                    prev.filter((p) => p.prk_center_id !== form.prk_center_id)
                );
            }
            closeModal();
        } catch (err) {
            console.error("요청 실패", err);
            alert("작업 실패");
        }
    };

    return (
        <div style={{ padding: "1rem" }}>
            <h1>관리자 페이지</h1>
            <Link to={"/"}>메인페이지</Link>
            <br />
            <Link to={"/admin"}>주차장 관리</Link>
            <br />

            {/* 모드 전환 & 실시간 저장 버튼 */}
            <button onClick={() => setIsLive(false)}>일반 주차장</button>
            <button onClick={() => setIsLive(true)}>실시간 정보</button>
            <button onClick={saveLiveToDB} style={{ marginLeft: "1rem" }}>
                실시간 정보 저장
            </button>

            {/* 검색 */}
            <div style={{ marginBottom: "1rem" }}>
                <select value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)}>
                    {!isLive ? (
                        <>
                            <option value="prk_center_id">주차장 ID</option>
                            <option value="prk_plce_nm">주차장 이름</option>
                            <option value="prk_plce_adres">주소</option>
                        </>
                    ) : (
                        <>
                            <option value="prk_center_id">주차장 ID</option>
                            <option value="pkfc_ParkingLots_total">전체 자리</option>
                            <option value="pkfc_Available_ParkingLots_total">여석</option>
                        </>
                    )}
                </select>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="검색어를 입력하세요"
                />
                <button onClick={handleSearch}>검색</button>
                {!isLive && (
                    <>
                        {" || "}
                        <button onClick={() => openModal("insert")}>주차장 추가</button>
                        <button onClick={() => openModal("update")}>주차장 수정</button>
                        <button onClick={() => openModal("delete")}>주차장 삭제</button>
                    </>
                )}
            </div>

            {/* 테이블 */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                <tr>
                    <th>ID</th>
                    {!isLive && <th>주차장명</th>}
                    {!isLive && <th>주소</th>}
                    {isLive ? (
                        <>
                            <th>전체 자리</th>
                            <th>여석</th>
                        </>
                    ) : (
                        <>
                            <th>위도</th>
                            <th>경도</th>
                        </>
                    )}
                </tr>
                </thead>
                <tbody>
                {parks.map((p, i) => (
                    <tr key={i}>
                        <td>{p.prk_center_id}</td>
                        {!isLive && (
                            <>
                                <td>{p.prk_plce_nm}</td>
                                <td>{p.prk_plce_adres}</td>
                                <td>{p.prk_plce_entrc_la}</td>
                                <td>{p.prk_plce_entrc_lo}</td>
                            </>
                        )}
                        {isLive && (
                            <>
                                <td>{p.pkfc_ParkingLots_total}</td>
                                <td>{p.pkfc_Available_ParkingLots_total}</td>
                            </>
                        )}
                    </tr>
                ))}
                </tbody>
            </table>

            {/* 페이지 네비게이션 */}
            <div style={{ marginTop: "1rem" }}>
                <button disabled={page === 0} onClick={() => setPage(page - 1)}>
                    이전
                </button>
                <span style={{ margin: "0 1rem" }}>
                    {page + 1} / {totalPages}
                </span>
                <button
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage(page + 1)}
                >
                    다음
                </button>
            </div>

            {/* 모달 */}
            <Modal show={show} onHide={closeModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {mode === "insert"
                            ? "주차장 추가"
                            : mode === "update"
                                ? "주차장 수정"
                                : "주차장 삭제"}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {(mode === "insert" || mode === "update") && (
                        <Form>
                            <Form.Group className="mb-2">
                                <Form.Label>관리 ID</Form.Label>
                                <Form.Control
                                    name="prk_center_id"
                                    value={form.prk_center_id || ""}
                                    onChange={onChange}
                                />
                            </Form.Group>
                            <Form.Group className="mb-2">
                                <Form.Label>주차장명</Form.Label>
                                <Form.Control
                                    name="prk_plce_nm"
                                    value={form.prk_plce_nm || ""}
                                    onChange={onChange}
                                />
                            </Form.Group>
                            <Form.Group className="mb-2">
                                <Form.Label>주소</Form.Label>
                                <Form.Control
                                    name="prk_plce_adres"
                                    value={form.prk_plce_adres || ""}
                                    onChange={onChange}
                                />
                            </Form.Group>
                            <Form.Group className="mb-2">
                                <Form.Label>위도</Form.Label>
                                <Form.Control
                                    name="prk_plce_entrc_la"
                                    value={form.prk_plce_entrc_la || ""}
                                    onChange={onChange}
                                />
                            </Form.Group>
                            <Form.Group className="mb-2">
                                <Form.Label>경도</Form.Label>
                                <Form.Control
                                    name="prk_plce_entrc_lo"
                                    value={form.prk_plce_entrc_lo || ""}
                                    onChange={onChange}
                                />
                            </Form.Group>
                        </Form>
                    )}
                    {mode === "delete" && (
                        <Form.Group className="mb-2">
                            <Form.Label>관리 ID</Form.Label>
                            <Form.Control
                                name="prk_center_id"
                                value={form.prk_center_id || ""}
                                onChange={onChange}
                            />
                        </Form.Group>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={closeModal}>
                        닫기
                    </Button>
                    <Button
                        variant={mode === "delete" ? "danger" : "primary"}
                        onClick={handleSubmit}
                    >
                        {mode === "insert"
                            ? "추가"
                            : mode === "update"
                                ? "수정"
                                : "삭제"}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Admin;
