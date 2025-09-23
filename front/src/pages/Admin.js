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

    const fetchTest=async()=>{
        /*
        const numOfRows = 10;
        const pageNo = 10000;

        const response = await fetch(
            `http://apis.data.go.kr/B553881/Parking/PrkSttusInfo?&serviceKey=${serviceKey}&numOfRows=${numOfRows}&pageNo=${pageNo}&format=2`
        );
        const result = await response.json();
        console.log(result);
        return result.PrkSttusInfo;*/
        try {
            // 본인 발급받은 인증키 입력
            // ✅ 예시 1: 서울시 전체 주차장 정보 (1~100개)
            const response = await fetch(
                `http://openapi.seoul.go.kr:8088/56776f4f766b696d3335704f6b434d/json/GetParkInfo/1/1000/`
            );

            // ✅ 예시 2: 특정 자치구 (강남구)
            // const response = await fetch(
            //     `http://openapi.seoul.go.kr:8088/${serviceKey}/json/GetParkInfo/1/100/강남`
            // );

            // ✅ 예시 3: 특정 주차장 코드 (압구정428 공영주차장, 코드: 1033125)
            // const response = await fetch(
            //     `http://openapi.seoul.go.kr:8088/${serviceKey}/json/GetParkInfo/1/5//1033125`
            // );

            // ✅ 예시 4: 미연계 주차장 (코드: 0)
            // const response = await fetch(
            //     `http://openapi.seoul.go.kr:8088/${serviceKey}/json/GetParkInfo/1/5///0`
            // );

            const result = await response.json();
            console.log(result);

            // 실제 데이터는 result.GetParkInfo.row 안에 있음
            if (result.GetParkInfo && result.GetParkInfo.row) {
                return result.GetParkInfo.row;
            } else {
                console.error("데이터 없음:", result);
                return [];
            }
        } catch (error) {
            console.error("API 호출 오류:", error);
            return [];
        }

    }

    const saveLiveToDB = async () => {
        try {

            // 요청 URL (구로구만 필터링)
            const response = await fetch(
                `http://openapi.seoul.go.kr:8088/56776f4f766b696d3335704f6b434d/json/GetParkingInfo/1/1000/`
            );

            // JSON 파싱
            const result = await response.json();
            console.log(result);

            // 실제 데이터는 result.GetParkingInfo.row 안에 있음
            if (result.GetParkingInfo && result.GetParkingInfo.row) {
                return result.GetParkingInfo.row;
            } else {
                console.error("데이터 없음:", result);
                return [];
            }
        } catch (error) {
            console.error("API 호출 오류:", error);
            return [];
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
            <button onClick={fetchTest} style={{ marginLeft: "1rem" }}>
                주차장 정보 추출 테스트
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
