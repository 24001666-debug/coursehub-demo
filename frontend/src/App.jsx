import { useEffect, useState } from "react";
import { api } from "./api.js";
import Notice from "./components/Notice.jsx";
import SectionTable from "./components/SectionTable.jsx";
import EnrollmentList from "./components/EnrollmentList.jsx";
import StudentForm from "./components/StudentForm.jsx";
import EnrollmentHistory from "./components/EnrollmentHistory.jsx";

const SECTION_PAGE_SIZE = 10;

export default function App() {
  const [draftId, setDraftId] = useState("22000004");
  const [studentId, setStudentId] = useState("22000004");
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [search, setSearch] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sectionPage, setSectionPage] = useState(0);
  const [sectionsHasNext, setSectionsHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sectionsError, setSectionsError] = useState("");
  const [notice, setNotice] = useState({ kind: "info", text: "" });
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [courseData, enrollmentData] = await Promise.all([
          api("/courses?limit=100", { signal: controller.signal }),
          api(`/students/${encodeURIComponent(studentId)}/enrollments`, {
            signal: controller.signal,
          }),
        ]);

        if (controller.signal.aborted) return;

        setCourses(courseData);
        setEnrollments(enrollmentData);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(err.message);
        setCourses([]);
        setEnrollments([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadData();

    return () => controller.abort();
  }, [studentId, refresh]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      skip: String(sectionPage * SECTION_PAGE_SIZE),
      limit: String(SECTION_PAGE_SIZE + 1),
    });
    const keyword = search.trim();
    if (keyword) params.set("q", keyword);
    if (courseCode) params.set("course_code", courseCode);
    if (onlyAvailable) params.set("available_only", "true");

    async function loadSections() {
      setSectionsLoading(true);
      setSectionsError("");

      try {
        const data = await api(`/sections?${params}`, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        setSections(data.slice(0, SECTION_PAGE_SIZE));
        setSectionsHasNext(data.length > SECTION_PAGE_SIZE);
      } catch (err) {
        if (controller.signal.aborted) return;
        setSections([]);
        setSectionsHasNext(false);
        setSectionsError(err.message);
      } finally {
        if (!controller.signal.aborted) setSectionsLoading(false);
      }
    }

    loadSections();
    return () => controller.abort();
  }, [courseCode, onlyAvailable, refresh, search, sectionPage]);

  function chooseStudent(event) {
    event.preventDefault();

    const nextId = draftId.trim();
    if (!/^\d{8}$/.test(nextId)) {
      setNotice({ kind: "error", text: "Mã demo phải gồm 8 chữ số." });
      return;
    }

    setNotice({ kind: "info", text: "" });
    setLoading(true);
    setSectionPage(0);
    setStudentId(nextId);
    setRefresh((value) => value + 1);
  }

  async function changeEnrollment(sectionId, cancel = false) {
    if (busy || loading || error) return;
    if (cancel && !window.confirm(`Hủy đăng ký lớp ${sectionId}?`)) return;

    setBusy(true);
    setNotice({ kind: "info", text: "Đang gửi yêu cầu..." });

    try {
      if (cancel) {
        await api(
          `/enrollments/${encodeURIComponent(studentId)}/${encodeURIComponent(sectionId)}`,
          { method: "DELETE" },
        );
      } else {
        await api("/enrollments", {
          method: "POST",
          body: { student_id: studentId, class_section_id: sectionId },
        });
      }

      setNotice({
        kind: "success",
        text: cancel
          ? `Đã hủy đăng ký ${sectionId}.`
          : `Đăng ký ${sectionId} thành công.`,
      });
    } catch (err) {
      setNotice({ kind: "error", text: err.message });
    } finally {
      // Đọc lại CSDL kể cả sau lỗi; không tự cộng/trừ số chỗ ở giao diện.
      setLoading(true);
      setRefresh((value) => value + 1);
      setBusy(false);
    }
  }

  const rows = sections.map((section) => ({
    ...section,
    course_name:
      courses.find((course) => course.code === section.course_code)?.name ??
      section.course_code,
    registered: enrollments.some(
      (item) => item.class_section_id === section.class_id,
    ),
  }));

  const disabled = loading || sectionsLoading || busy || Boolean(error);

  return (
    <main className="container">
      <header className="hero">
        <p className="eyebrow">CSDL WEB VÀ HỆ THỐNG THÔNG TIN · BUỔI 5</p>
        <h1>CourseHub</h1>
        <p>Tra cứu và đăng ký lớp học phần</p>
        <span className="chip">React → FastAPI → PostgreSQL</span>
      </header>

      <p className="demo-note">
        Môi trường thực hành. Nhập mã sinh viên để thử dữ liệu, không phải đăng
        nhập.
      </p>

      <StudentForm
        draftId={draftId}
        studentId={studentId}
        busy={busy}
        loading={loading}
        onDraftChange={setDraftId}
        onSubmit={chooseStudent}
        onRefresh={() => setRefresh((value) => value + 1)}
      />

      <Notice kind={notice.kind}>{notice.text}</Notice>
      <Notice kind="error">{error}</Notice>
      {loading && <Notice>Đang tải dữ liệu từ API...</Notice>}

      {!loading && !error && (
        <div className="workspace">
          <section className="panel">
            <h2>2. Danh sách lớp học phần</h2>
            <div className="filters">
              <label htmlFor="search">Tìm lớp / học phần</label>
              <input
                id="search"
                value={search}
                placeholder="Ví dụ: WEB hoặc INT2204"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setSectionPage(0);
                }}
              />
              {/* Bài 2 - Week 5: mã học phần được lấy từ GET /courses. */}
              <label htmlFor="course-filter">Lọc theo học phần</label>
              <select
                id="course-filter"
                value={courseCode}
                onChange={(event) => {
                  setCourseCode(event.target.value);
                  setSectionPage(0);
                }}
              >
                <option value="">Tất cả học phần</option>
                {courses.map((course) => (
                  <option key={course.code} value={course.code}>
                    {course.code}
                  </option>
                ))}
              </select>
              <label className="check">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(event) => {
                    setOnlyAvailable(event.target.checked);
                    setSectionPage(0);
                  }}
                />
                Chỉ hiện lớp còn chỗ
              </label>
            </div>
            {sectionsLoading && <Notice>Đang tải lớp học phần...</Notice>}
            {sectionsError && <Notice kind="error">{sectionsError}</Notice>}
            {!sectionsLoading && !sectionsError && (
              <>
                <SectionTable
                  rows={rows}
                  disabled={disabled}
                  onEnroll={(id) => changeEnrollment(id)}
                />
                <nav className="pagination" aria-label="Phân trang lớp học phần">
                  <button
                    type="button"
                    className="secondary"
                    disabled={sectionPage === 0 || sectionsLoading}
                    onClick={() => setSectionPage((value) => value - 1)}
                  >
                    Trang trước
                  </button>
                  <span>Trang {sectionPage + 1}</span>
                  <button
                    type="button"
                    className="secondary"
                    disabled={!sectionsHasNext || sectionsLoading}
                    onClick={() => setSectionPage((value) => value + 1)}
                  >
                    Trang sau
                  </button>
                </nav>
              </>
            )}
          </section>

          <section className="panel">
            <h2>3. Lớp đã đăng ký</h2>
            <p className="muted">
              Sinh viên {studentId} · {enrollments.length} lớp
            </p>
            <EnrollmentList
              rows={enrollments}
              disabled={disabled}
              onCancel={(id) => changeEnrollment(id, true)}
            />
          </section>
        </div>
      )}

      {!loading && !error && (
        <EnrollmentHistory key={studentId} studentId={studentId} />
      )}

      <footer>
        Bộ lọc và phân trang lớp học phần chạy ở máy chủ; API quyết định số chỗ
        và tính hợp lệ của đăng ký.
      </footer>
    </main>
  );
}