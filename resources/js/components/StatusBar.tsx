import '../../css/StatusBar.css';

const StatusBar = ({ value = 0, max = 0, dotCount = 0 }) => {
    const activeDots = Math.round((value / max) * dotCount);

    return (
        <div className="status-bar">
            {[...Array(dotCount)].map((_, index) => (
                <div key={index} className={`dot ${index < activeDots ? 'active' : 'inactive'}`} />
            ))}
        </div>
    );
};

export default StatusBar;
