"use client";

import { useState } from "react";
import { type CalendarEvent } from "./mockData";

interface CalendarWidgetProps {
  events: CalendarEvent[];
}

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];
const WEEKDAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

const EVENT_TYPE_LABELS: Record<CalendarEvent["type"], string> = {
  prova:     "Prova",
  atividade: "Atividade",
  feriado:   "Feriado",
  evento:    "Evento",
  reuniao:   "Reunião",
  aula:      "Aula",
  recesso:   "Recesso",
};

export default function CalendarWidget({ events }: CalendarWidgetProps) {
  const today = new Date();
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const firstDay = new Date(current.year, current.month, 1).getDay();
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();

  const eventsByDay = events.reduce<Record<number, CalendarEvent[]>>((acc, ev) => {
    const d = new Date(ev.date + "T12:00:00");
    if (d.getFullYear() === current.year && d.getMonth() === current.month) {
      const day = d.getDate();
      acc[day] = [...(acc[day] || []), ev];
    }
    return acc;
  }, {});

  function prev() {
    setCurrent((c) => {
      if (c.month === 0) return { year: c.year - 1, month: 11 };
      return { ...c, month: c.month - 1 };
    });
    setSelectedDay(null);
  }

  function next() {
    setCurrent((c) => {
      if (c.month === 11) return { year: c.year + 1, month: 0 };
      return { ...c, month: c.month + 1 };
    });
    setSelectedDay(null);
  }

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];

  const isToday = (day: number) =>
    today.getDate() === day &&
    today.getMonth() === current.month &&
    today.getFullYear() === current.year;

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col h-full"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(240,192,64,0.1)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid rgba(240,192,64,0.08)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🗺️</span>
          <span className="text-sm font-semibold" style={{ color: "#f0c040" }}>
            Mapa de Rota
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prev}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all duration-150"
            style={{ color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.05)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(240,192,64,0.15)"; e.currentTarget.style.color = "#f0c040"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
          >
            ◀
          </button>
          <span className="text-xs font-semibold w-28 text-center text-white">
            {MONTHS[current.month]} {current.year}
          </span>
          <button
            onClick={next}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all duration-150"
            style={{ color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.05)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(240,192,64,0.15)"; e.currentTarget.style.color = "#f0c040"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
          >
            ▶
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="px-3 pt-3 pb-2">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-xs font-medium py-1" style={{ color: "rgba(255,255,255,0.3)" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-0.5">
          {/* Empty cells for first week */}
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`e${i}`} />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayEvents = eventsByDay[day] || [];
            const isSelected = selectedDay === day;
            const isTodayDay = isToday(day);

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                className="relative flex flex-col items-center py-1.5 rounded-lg transition-all duration-150 group"
                style={{
                  background: isSelected
                    ? "rgba(240,192,64,0.2)"
                    : isTodayDay
                    ? "rgba(27,58,143,0.4)"
                    : "transparent",
                }}
              >
                <span
                  className="text-xs font-medium leading-none"
                  style={{
                    color: isSelected
                      ? "#f0c040"
                      : isTodayDay
                      ? "#ffffff"
                      : "rgba(255,255,255,0.65)",
                    fontWeight: isTodayDay ? 700 : 400,
                  }}
                >
                  {day}
                </span>
                {/* Event dots */}
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((ev, j) => (
                      <span
                        key={j}
                        className="w-1 h-1 rounded-full"
                        style={{ background: ev.color }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day events */}
      <div
        className="flex-1 px-3 pb-3 overflow-y-auto"
        style={{ borderTop: "1px solid rgba(240,192,64,0.06)" }}
      >
        {selectedDay && (
          <div className="pt-2 space-y-1.5">
            <p className="text-xs font-medium mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
              {selectedDay} de {MONTHS[current.month]}
            </p>
            {selectedEvents.length === 0 ? (
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                Nenhum evento neste dia
              </p>
            ) : (
              selectedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                  style={{ background: `${ev.color}15`, border: `1px solid ${ev.color}30` }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ev.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-white">{ev.title}</p>
                    <p className="text-xs" style={{ color: ev.color }}>
                      {EVENT_TYPE_LABELS[ev.type]}{ev.time ? ` • ${ev.time}` : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {!selectedDay && (
          <p className="text-xs text-center pt-3" style={{ color: "rgba(255,255,255,0.2)" }}>
            Selecione um dia para ver os eventos
          </p>
        )}
      </div>
    </div>
  );
}
