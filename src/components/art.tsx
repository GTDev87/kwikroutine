import React from "react";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";
import { Pattern } from "../domain/types";
import { C } from "./ui";
export function HeroArt({ height = 220 }: { height?: number }) {
  return (
    <Svg
      width="100%"
      height={height}
      viewBox="0 0 340 240"
      accessibilityLabel="Illustration of a person enjoying movement"
    >
      <Circle cx="173" cy="119" r="97" fill={C.surface2} />
      <Ellipse cx="176" cy="219" rx="102" ry="9" fill={C.line} />
      <Path
        d="M39 151c-8-29 9-51 30-56m229-24c-2 28-17 36-34 38"
        stroke={C.faint}
        strokeWidth="2"
        fill="none"
        strokeDasharray="4 6"
      />
      <Path d="m284 31 4 13 14 4-14 4-4 13-4-13-13-4 13-4Z" fill={C.accent} />
      <Circle cx="56" cy="67" r="7" fill={C.accent} />
      <Path d="m45 200 10-9m-13-3 11 1" stroke={C.accent} strokeWidth="2" />
      <Path
        d="m179 141-39 42-51 10"
        fill="none"
        stroke="#55555C"
        strokeWidth="26"
        strokeLinecap="round"
      />
      <Path
        d="m187 143 37 29-11 39"
        fill="none"
        stroke="#6B6B73"
        strokeWidth="27"
        strokeLinecap="round"
      />
      <Path d="m89 194-17 3-3 11 29-2" fill="#F8FAE9" />
      <Path d="m208 212-2 12 29-1c2-9-13-9-14-13" fill="#F8FAE9" />
      <Path
        d="m171 85-24 40-39-10"
        fill="none"
        stroke="#BF7751"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <Path
        d="m192 85 34 18 24-32"
        fill="none"
        stroke="#D79B6D"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <Path d="M161 83q16-12 35-4l7 65q-21 17-52-2Z" fill="#F8F2DD" />
      <Path d="m176 78 0-19" stroke="#D79B6D" strokeWidth="15" />
      <Ellipse
        cx="183"
        cy="49"
        rx="18"
        ry="22"
        fill="#D79B6D"
        transform="rotate(16 183 49)"
      />
      <Path
        d="M164 52q-13-30 13-31 26-8 30 16-14 9-25-2l-6 18Z"
        fill="#2A2A2E"
      />
      <Path
        d="m195 48 2 1"
        stroke="#2A2A2E"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <Path
        d="M151 106q19 9 48 1"
        stroke={C.line}
        strokeWidth="2"
        fill="none"
      />
    </Svg>
  );
}
export function ExerciseArt({
  pattern,
  height = 180,
}: {
  pattern: Pattern;
  height?: number;
}) {
  const floor = pattern === "core" || pattern === "hinge";
  return (
    <Svg
      width="100%"
      height={height}
      viewBox="0 0 320 190"
      accessibilityLabel={`${pattern} movement illustration`}
    >
      <Circle cx="165" cy="90" r="75" fill={C.surface2} />
      <Ellipse cx="163" cy="166" rx="105" ry="7" fill={C.line} />
      <G fill="none" strokeLinecap="round" strokeLinejoin="round">
        {floor ? (
          <>
            <Path
              d="m91 124 66-30 49 37 39 5"
              stroke={C.accent}
              strokeWidth="18"
            />
            <Path
              d="m150 101 1 48m-40-24-15 28"
              stroke="#CA8C62"
              strokeWidth="12"
            />
            <Circle cx="73" cy="128" r="16" fill="#CA8C62" stroke="none" />
          </>
        ) : (
          <>
            <Path
              d={
                pattern === "squat"
                  ? "m159 94 38 32-31 30m-9-64-35 35 29 31"
                  : "m160 99-24 57m34-58 25 58"
              }
              stroke={C.accent}
              strokeWidth="20"
            />
            <Path d="m155 63 12 40" stroke="#FBF4DA" strokeWidth="32" />
            <Circle cx="150" cy="39" r="17" fill="#CA8C62" stroke="none" />
            <Path
              d={
                pattern === "push"
                  ? "m141 65-28-15-3-27m72 50 27-22 1-28"
                  : pattern === "pull"
                    ? "m141 68-37 24-7-28m79 4 35 25 11-28"
                    : "m145 68-29 24 51-5m10-14 37 15 26-15"
              }
              stroke="#CA8C62"
              strokeWidth="12"
            />
            <Path
              d="m143 28 21 5q-3-23-25-12l-6 21"
              fill="#2A2A2E"
              stroke="none"
            />
          </>
        )}
        <Path d="M68 166h189" stroke={C.faint} strokeWidth="2" />
        <Path d="m250 41 0 16m-8-8h16" stroke={C.accent} strokeWidth="2" />
      </G>
    </Svg>
  );
}
